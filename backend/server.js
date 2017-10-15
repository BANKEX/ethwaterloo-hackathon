const express        = require('express');
var rimraf = require('rimraf');
rimraf.sync('./db');
console.log("Cleared DB");
var Router = require('named-routes');
const app            = express();
var router = new Router();
router.extendExpress(app);
router.registerAppHelpers(app);
const comp = require('./compile');
const bodyParser = require('body-parser');
 
const assert = require('assert');
// const comp = require('./compile');
const moment = require('moment');
const coinstring = require('coinstring');
const fs = require("fs");
const solc = require('solc');
const Artifactor = require("truffle-artifactor"); 
const async = require("async");
const TruffleContract = require('truffle-contract');
 
var TestRPC = require("ethereumjs-testrpc");
 
const Web3 = require("web3");
const util = require('util');
var ethUtil = require('ethereumjs-util'); 
const PlasmaTransaction = require('./lib/Tx/tx');
const Block = require('./lib/Block/block');
const fromBtcWif = coinstring.createDecoder(0x80);
const levelup = require('levelup')
const leveldown = require('leveldown')
const levelDB = levelup(leveldown('./db'))
var lastBlock;
var lastBlockHash;
var txParamsFIFO = [];
var blockMiningTimer;
const utxoPrefix = Buffer.from('utxo');
const blockPrefix = Buffer.from('blk');
const headerPrefix = Buffer.from('hdr');
const transactionPrefix = Buffer.from('tx');
const privKeys = [fromBtcWif("5JmrM8PB2d5XetmVUCErMZYazBotNzSeMrET26WK8y3m8XLJS98"), 
                    fromBtcWif("5HtkDncwskEM5FiBQgU1wqLLbayBmfh5FSMYtLngedr6C6NhvWr")];
const plasmaOperatorPrivKey = fromBtcWif("5JMneDeCfBBR1M6mX7SswZvC8axrfxNgoYKtu5DqVokdBwSn2oD");
const plasmaOperatorAddressBuffer = ethUtil.privateToAddress(plasmaOperatorPrivKey);
const plasmaOperatorAddress = "0x"+plasmaOperatorAddressBuffer.toString('hex');                
const port = 8000;
app.use(bodyParser.json());



// var web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));
var BigNumber;
var sendAsyncPromisified;
var getBlockNumberPromisified;
var getBalancePromisified;
var getAccountsPromisified;
var PlasmaContract;
var DeployedPlasmaContract;
var Web3PlasmaContract;
var allAccounts;
var web3;
function startVM(){
    var provider = TestRPC.provider({
        total_accounts: 10,
        time:new Date(),
        verbose:false,
        gasPrice: 0,
      accounts:[
          {secretKey:"0x"+fromBtcWif("5JmrM8PB2d5XetmVUCErMZYazBotNzSeMrET26WK8y3m8XLJS98").toString('hex'), balance: 4.2e18},
          {secretKey:"0x"+fromBtcWif("5HtkDncwskEM5FiBQgU1wqLLbayBmfh5FSMYtLngedr6C6NhvWr").toString('hex'), balance: 4.2e18},
          {secretKey:"0x"+fromBtcWif("5JMneDeCfBBR1M6mX7SswZvC8axrfxNgoYKtu5DqVokdBwSn2oD").toString('hex'), balance: 4.2e18}    
      ],
        mnemonic: "42"
        // ,
        // logger: console
      });
      web3 = new Web3(provider);
      BigNumber = web3.BigNumber;
      sendAsyncPromisified = util.promisify(provider.sendAsync).bind(provider);
      var tmp_func = web3.eth.getBalance;
      delete tmp_func['call'];
      getBlockNumberPromisified= util.promisify(web3.eth.getBlockNumber);
      getBalancePromisified = util.promisify(tmp_func).bind(web3.eth);
    //   DECIMAL_MULTIPLIER_BN = new BigNumber(10**SET_DECIMALS);
      getAccountsPromisified = util.promisify(web3.eth.getAccounts);
}

async function populateAccounts(){
    allAccounts = await web3.eth.getAccounts() ;
    allAccounts = allAccounts.map((a) => {
        return a.toLowerCase();
    })
    // allAccounts = await getAccountsPromisified();
    PlasmaContract = new TruffleContract(require("./build/contracts/PlasmaParent.json"));
    Web3PlasmaContract = new web3.eth.Contract(PlasmaContract.abi);
    [PlasmaContract].forEach(function(contract) {
        contract.setProvider(web3.currentProvider);
        contract.defaults({
        gas: 3.5e6,
        from: allAccounts[2]
        })
    });
}

function deployContracts() {
    return async function() {
            DeployedPlasmaContract = await Web3PlasmaContract.deploy({data: PlasmaContract.bytecode}).send({from: allAccounts[2], gas: 3.5e6}) ;
            DeployedPlasmaContract.events.DepositEvent(
                {
                // filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
                // fromBlock: 0
                fromBlock:0, toBlock:'latest'
            })
            .on('data', function(event){
                processDepositEvent(event);
            })
            .on('changed', function(event){
                // remove event from local database
            })
            .on('error', console.error);
            // DeployedPlasmaContract = await PlasmaContract.new();
            console.log("Deployed at "+ DeployedPlasmaContract._address);
    }
}

function processDepositEvent(event){
    const {_from, _amount, _duringBlock} = event.returnValues;
    const tx = createFundingTransaction(_from)
    txParamsFIFO.push(tx);
    console.log("Pushed new TX")
    console.log(event); // same results as the optional callback above
}

function submitBlockHeader(block){
    return async function() {
        const hexData = Buffer.concat(block.header.raw).toString('hex');
        try{
            var res = await DeployedPlasmaContract.methods.submitBlockHeader('0x'+hexData).send({from: allAccounts[2], gas:3.5e6});
            return true;
        }
        catch(err){
            console.log(err)
        }
        return false
    }
}


function signForECRECOVER(dataBuffer, privKeyBuffer) {
    const hash = ethUtil.hashPersonalMessage(dataBuffer);
    const signatureObject = ethUtil.ecsign(hash, privKeyBuffer);
    return {hash, signatureObject};
}

function checkSender(dataBuffer, signatureObject, address) {
    const hash = ethUtil.hashPersonalMessage(dataBuffer);
    const pubKey = ethUtil.ecrecover(hash, signatureObject.v, signatureObject.r, signatureObject.s);
    const signedFromAddress = ethUtil.publicToAddress(pubKey).toString('hex');
    return signedFromAddress == address;
}

function testSignature() {
    const data = "test";
    const dataBuffer = Buffer.from(data);
    const {hash, signatureObject} = signForECRECOVER(dataBuffer, privKeys[0]);
    const valid = checkSender(dataBuffer, signatureObject, ethUtil.privateToAddress(privKeys[0]).toString('hex'));
    assert(valid);
}

// testSignature();
 

function testTx() {
    const txParams = {
        blockNumber: "0x00000001",
        txInBlock: "0x02",
        assetId: '0x00000003',
        to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'), 
      }
    const tx = new PlasmaTransaction(txParams);
    const txhash = tx.hash(false).toString('hex');
    tx.sign(privKeys[0]); 
    assert(tx.validate());
    assert(tx.getSenderAddress().toString('hex') == ethUtil.privateToAddress(privKeys[0]).toString('hex'))
    return true;  
}

function createTx(params, privKeyBuffer){
    const tx = new PlasmaTransaction(params);
    tx.sign(privKeyBuffer); 
    const arrayRepr = tx.toJSON();
    return {
        blockNumber: arrayRepr[0],
        txInBlock: arrayRepr[1],
        assetId: arrayRepr[2],
        to: arrayRepr[3],
        v: arrayRepr[4],
        r: arrayRepr[5],
        s: arrayRepr[6] 
    }
}

function createFundingTransaction(toAddressString) {
    const txParams = {
        blockNumber: '0x00000000',
        txInBlock: '0x00',
        assetId: '0x00000000',
        to: ethUtil.addHexPrefix(toAddressString)
    }
    const tx = new PlasmaTransaction(txParams);
    tx.sign(plasmaOperatorPrivKey); 
    return tx;
}

// testTx();

function testBlock() {
    const txParams = {
        blockNumber: "0x00000001",
        txInBlock: "0x02",
        assetId: '0x00000003',
        to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'), 
      }
    var TXs = [];
    for (let i=0; i< 42; i++) {  
        const tx = new PlasmaTransaction(txParams);
        tx.sign(privKeys[0]); 
        TXs.push(tx);
    }
    const blockParams = {
        blockNumber: "0x00000001",
        parentHash: Buffer.alloc(32),
        transactions: TXs
    }
    const block = new Block(blockParams); 
    block.sign(privKeys[0]);
    console.log(block.toJSON())
    assert(block.validate());
    assert(block.getSenderAddress().toString('hex') == ethUtil.privateToAddress(privKeys[0]).toString('hex'))
    var proof = block.merkleTree.getProof(63, false)
    console.log(proof);
    return true;  
}

// testBlock();



async function tryToMine() {
    const mined = await createBlock( );
    if (mined) {
        clearTimeout( blockMiningTimer );
        blockMiningTimer = setTimeout(async () => {
            tryToMine()
          }, 1000);
        return
    }
    else{
        if (blockMiningTimer._called && blockMiningTimer._destroyed) {
            blockMiningTimer = setTimeout(async () => {
                tryToMine()
              }, 1000);
        }
        return;
    }
}

async function createBlock() {
    try{
        try{
            lastBlock = await levelDB.get('lastBlockNumber');
        }
        catch(error) {
            lastBlock = Buffer.alloc(4)
            lastBlock.writeUInt32BE(0,0) 
            await levelDB.put('lastBlockNumber', lastBlock);
        }
        try{
            lastBlockHash = await levelDB.get('lastBlockHash');
        }
        catch(error) {
            lastBlockHash = ethUtil.sha3('bankex.com')
            await levelDB.put('lastBlockHash', lastBlockHash);
        }

        let txSlice;
        if (txParamsFIFO.length > 64 ){
            txSlice = txParamsFIFO.splice(0, 64);
        } else {
            txSlice = txParamsFIFO.splice(0, txParamsFIFO.length);
        }
        if (txSlice.length == 0){
            return false;
        }
        var TXs =
            txSlice.map( (t) => {
                if (t.__proto__.constructor.name == "PlasmaTransaction"){
                    return t;
                }
                return new PlasmaTransaction(t);
            });
        TXs = await Promise.all(TXs.filter(async (tx) => {    
            const isValid = await checkUTXO (tx );
            if (isValid && tx.validate()) {
                return true;
            }
            return false;
        }
        )
        )
        const lastBlockNumber = lastBlock.readUInt32BE(0)
        const newBlockNumber = lastBlockNumber + 1;
        const newBlockNumberBuffer = Buffer.alloc(4)
        newBlockNumberBuffer.writeUInt32BE(newBlockNumber,0);
        const blockParams = {
            blockNumber:  newBlockNumberBuffer,
            parentHash: lastBlockHash,
            transactions: TXs
        }
        const block = new Block(blockParams); 
        block.sign(plasmaOperatorPrivKey);
        assert(block.validate());
        await writeBlock(block);
        console.log("Created block " + newBlockNumber);
        const submitted = await submitBlockHeader(block)();
        if (!submitted) {
            throw("Couldn't submit");
        }
        console.log("Submitted header for block "+newBlockNumber)
        return true;
            
    }
    catch(err){
        console.log(err);
    }
} 
 

async function prepareProofsForWithdraw(blockNumber, txInBlock) {
    const block = await getBlockByNumber(blockNumber);
    const tx = block.transactions[txInBlock];
    const proof = "0x" + Buffer.concat(block.merkleTree.getProof(txInBlock, true)).toString('hex');
    const encodedTx = '0x' + Buffer.concat(tx.raw).toString('hex')
    console.log(block.header.merkleRootHash.toString('hex'));
    return {
        blockNumber: blockNumber,
        txInBlock: txInBlock,
        merkleProof: proof,
        tx: encodedTx
    }
}

async function writeBlock(block) {
    var writeRequest =  levelDB.batch()
                    .put('lastBlockNumber', block.header.blockNumber)
                    .put('lastBlockHash', block.hash(true))
                    .put(Buffer.concat([blockPrefix,block.header.blockNumber]),Buffer.concat(block.raw))
                    .put(Buffer.concat([headerPrefix,block.header.blockNumber]),Buffer.concat(block.header.raw))
    block.transactions.forEach((tx, i)=>{
        writeRequest.del(Buffer.concat([utxoPrefix, tx.blockNumber, tx.txInBlock]))
        const txNewBuffer = Buffer.alloc(1)
        txNewBuffer.writeUInt8(i)
 
        const keyForUtxo = Buffer.concat([utxoPrefix, block.header.blockNumber, txNewBuffer]);
        writeRequest.put(Buffer.concat([transactionPrefix, block.header.blockNumber, txNewBuffer]), Buffer.concat(tx.raw))
        writeRequest.put(Buffer.concat([utxoPrefix, block.header.blockNumber, txNewBuffer]), Buffer.concat(tx.raw))
    })

    await writeRequest.write();
}

async function checkUTXO(spendingTx) {

    if (spendingTx.blockNumber == 0 || (Buffer.isBuffer(spendingTx.blockNumber) && spendingTx.blockNumber.readUInt32BE(0) == 0) ) {
        return plasmaOperatorAddress.toLowerCase() === ('0x'+spendingTx.getSenderAddress().toString('hex')).toLowerCase();
        // return plasmaOperatorAddressBuffer.equals(spendingTx.getSenderAddress());
    } else {
        const keyForUnspent = Buffer.concat([utxoPrefix, spendingTx.blockNumber, spendingTx.txInBlock])
        try {
            unspentTxRaw = await levelDB.get(keyForUnspent)
            const unspentTx = new PlasmaTransaction(sliceRawBufferForTx(unspentTxRaw))
            if (!unspentTx.validate()){
                return false
            }
            if (!unspentTx.to.equals(spendingTx.getSenderAddress())){
                return false
            }
            return true;
        }
        catch(error){
            return false;
        }
    }
    return false;
 
}

async function getBlockByNumber(blockNumber) {
    const blockNumberBuffer = Buffer.alloc(4)
    blockNumberBuffer.writeUInt32BE(blockNumber);
    const key = Buffer.concat([blockPrefix, blockNumberBuffer])
    const blockBin = await levelDB.get(key)
    const block = new Block(blockBin)
    return block
} 

 
app.get('/plasmaBlock/:id', 'getBlockByNumber', async function(req, res){
    try{ 
        const blockNumber = parseInt(req.params.id);
        if (!blockNumber){
            return res.json({error: true, reason: "invalid block number"});
        }
        // const blockNumberBuffer = Buffer.alloc(4)
        // blockNumberBuffer.writeUInt32BE(blockNumber);
        // const key = Buffer.concat([blockPrefix, blockNumberBuffer])
        // const blockBin = await levelDB.get(key)
        const block = await getBlockByNumber(blockNumber);
        return res.json(block.toJSON())
    }
    catch(error){
        return res.json({error: true, reason: "invalid block number"});
    }
});

app.get('/utxos/:address', 'getUtxosByAddress', async function(req, res, next){
    try{ 
        addressString = req.params.address
        addressString = ethUtil.addHexPrefix(addressString)
        getUTXOforAddress(addressString, function(err, utxos) {
            if (err){
                console.log(err)
                 res.json({error: true, reason: "invalid address"});
                 next()
            }
            res.json({address: addressString, utxos})
            next()
            return
        })
    }
    catch(error){
         res.json({error: true, reason: "invalid address"});
        next()
    }
});

app.get('/plasmaParent/lastSubmittedHeader', 'lastSubmittedHeader', async function(req, res){
    try{ 
        const headerNumber = await DeployedPlasmaContract.methods.lastBlockNumber().call({from:allAccounts[2]});

        return res.json({lastSubmittedHeader:headerNumber});
    }
    catch(error){
         return res.json({error: true, reason: "invalid request"});
    }
});

app.get('/ethereumBalance/:address', 'balanceForAddress', async function(req, res){
    try{ 
        addressString = req.params.address
        addressString = ethUtil.addHexPrefix(addressString)
        const bal = await web3.eth.getBalance(addressString);
        return res.json({balanceInWei:bal});
    }
    catch(error){
         return res.json({error: true, reason: "invalid address"});
    }
});

app.get('/plasmaParent/blockHeader/:blockNumber', 'getParentContractHeader', async function(req, res){
    try{ 
        const blockNumber = parseInt(req.params.blockNumber);
        if (!blockNumber){
            return res.json({error: true, reason: "invalid block number"});
        }
        var header = await DeployedPlasmaContract.methods.headers(blockNumber).call({from: allAccounts[2]});
        return res.json(header)
    }
    catch(error){
         res.json({error: true, reason: "invalid address"});
    }
});



app.post('/sendPlasmaTransaction', 'sendPlasmaTransaction', async function(req, res){
    try{ 
        const {blockNumber, txInBlock, assetId, to, v, r, s} = req.body
        if (!blockNumber || !txInBlock || !assetId || !to || !v || !r || !s) {
            return res.json({error: true, reason: "invalid transation"});
            // next()
        }
        const tx = new PlasmaTransaction({blockNumber, txInBlock, assetId, to, v, r, s})
        if (!tx.validate()){
            return res.json({error: true, reason: "invalid transation"});
        }
        var unspentTxRaw
        try{
            const keyForUtxo = Buffer.concat([utxoPrefix, tx.blockNumber, tx.txInBlock]);
             unspentTxRaw = await levelDB.get(keyForUtxo);
        } 
        catch(err){
            return res.json({error: true, reason: "invalid transation"});
        }
        const unspentTx = new PlasmaTransaction(sliceRawBufferForTx(unspentTxRaw))
        if (!unspentTx.validate()){
            return res.json({error: true, reason: "invalid transation"});
        }
        if (!unspentTx.to.equals(tx.getSenderAddress())){
            return res.json({error: true, reason: "invalid transation"});
        }
        txParamsFIFO.push(tx);
        console.log("Pushed new TX")
        return res.json({error: false, status: "accepted"});
    }
    catch(error){
         res.json({error: true, reason: "invalid transation"});
 
    }
});

// For demo purposes only
app.post('/sendAndSign', 'sendAndSignPlasmaTransaction', async function(req, res){
    try{ 
        const {blockNumber, txInBlock, assetId, to, from} = req.body
        if (!blockNumber || !txInBlock || !assetId || !to || !from) {
            return res.json({error: true, reason: "invalid transation"});
            // next()
        }
        const tx = new PlasmaTransaction({blockNumber, txInBlock, assetId, to})
        const idxInKeys = allAccounts.indexOf(from);
        if (idxInKeys != 1 && idxInKeys != 0){
            return res.json({error: true, reason: "invalid transation"});
        } 
        const privKey = privKeys[idxInKeys];
        tx.sign(privKey);
        if (!tx.validate()){
            return res.json({error: true, reason: "invalid transation"});
        }
        var unspentTxRaw
        try{
            const keyForUtxo = Buffer.concat([utxoPrefix, tx.blockNumber, tx.txInBlock]);
             unspentTxRaw = await levelDB.get(keyForUtxo);
        } 
        catch(err){
            return res.json({error: true, reason: "invalid transation"});
        }
        const unspentTx = new PlasmaTransaction(sliceRawBufferForTx(unspentTxRaw))
        if (!unspentTx.validate()){
            return res.json({error: true, reason: "invalid transation"});
        }
        if (!unspentTx.to.equals(tx.getSenderAddress())){
            return res.json({error: true, reason: "invalid transation"});
        }
        txParamsFIFO.push(tx);
        console.log("Pushed new TX")
        return res.json({error: false, status: "accepted"});
    }
    catch(error){
         res.json({error: true, reason: "invalid transation"});
 
    }
});

//demo purposes only
app.post('/startWithdraw', 'startWithdraw', async function(req, res){
    try{ 
        const {blockNumber, txInBlock, assetId, from} = req.body
        if (!blockNumber || !txInBlock || !assetId || !from) {
            return res.json({error: true, reason: "invalid transation"});
            // next()
        }
        // const to = plasmaOperatorAddress;
        // const tx = new PlasmaTransaction({blockNumber, txInBlock, assetId, to})
        const blockNumberBuffer = ethUtil.toBuffer(blockNumber)
        const txInBlockBuffer = ethUtil.toBuffer(txInBlock)
        var unspentTxRaw
        try{
            const keyForUtxo = Buffer.concat([utxoPrefix, blockNumberBuffer, txInBlockBuffer]);
             unspentTxRaw = await levelDB.get(keyForUtxo);
        } 
        catch(err){
            return res.json({error: true, reason: "invalid transation"});
        }
        const unspentTx = new PlasmaTransaction(sliceRawBufferForTx(unspentTxRaw))
        if (!unspentTx.validate()){
            return res.json({error: true, reason: "invalid transation"});
        }
        if (('0x'+unspentTx.to.toString('hex').toLowerCase()) != from){
            return res.json({error: true, reason: "invalid transation"});
        }
        const preparedProof = await prepareProofsForWithdraw(blockNumberBuffer.readUInt32BE(0), txInBlockBuffer.readUInt8(0));
        var result = await DeployedPlasmaContract.methods.startWithdraw(preparedProof.blockNumber, 
            preparedProof.txInBlock , preparedProof.tx, preparedProof.merkleProof ).send({from:from, gas: 3.6e6});
        const acceptanceEvent = result.events.WithdrawRequestAcceptedEvent; 
        const response =  {error: false, status: "accepted", 
                inEthereumBlock: acceptanceEvent.returnValues._ethBlockNumber,
                withdrawIndex: acceptanceEvent.returnValues._withdrawIndex}
        return res.json(response);
    }
    catch(error){
         res.json({error: true, reason: "invalid transation"});
 
    }
});


function jump(duration) {
    return async function() {
    //   console.log("Jumping " + duration + "...");

      var params = duration.split(" ");
      params[0] = parseInt(params[0])

      var seconds = moment.duration.apply(moment, params).asSeconds();
      await sendAsyncPromisified({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: new Date().getTime()
        });
    }
}

//demo purposes only
app.post('/finalizeWithdraw', 'finalizeWithdraw', async function(req, res){
    try{ 
        const {inEthereumBlock, withdrawIndex} = req.body
        if (!inEthereumBlock || !withdrawIndex) {
            return res.json({error: true, reason: "invalid request"});
            // next()
        }
        await jump("2 days")();
        var result = await DeployedPlasmaContract.methods.finalizeWithdraw(inEthereumBlock, withdrawIndex).send({from:allAccounts[2], gas: 3.6e6});
        const finalizationEvent = result.events.WithdrawFinalizedEvent; 
        const response =  {error: false, status: "finalized", to: finalizationEvent.returnValues._to}
        return res.json(response);
    }
    catch(error){
         res.json({error: true, reason: "invalid request"});
 
    }
});

// emulate deposit on main chain
app.post('/fundPlasma', 'fundPlasma', async function(req, res){
    try{ 
        const {toAddress } = req.body
        if (!toAddress ) {
            return res.json({error: true, reason: "invalid transation"});
        }
        var result = await DeployedPlasmaContract.methods.deposit().send({from: toAddress, value: web3.utils.toWei(0.1, 'ether')});
        if (!result) {
            return res.json({error: true, reason: "invalid transation"});
        }
        processDepositEvent(result.events.DepositEvent)
        // const tx = createFundingTransaction(toAddress)
        // txParamsFIFO.push(tx);
        // console.log("Pushed new TX")
        return res.json({error: false, status: "accepted"});
    }
    catch(error){
         res.json({error: true, reason: "invalid transation"});
 
    }
});




async function getUTXOforAddress(addressString, cb) {
    addressString = ethUtil.addHexPrefix(addressString)
 
    assert(ethUtil.isValidAddress(addressString));
    address = ethUtil.toBuffer(addressString);
    utxos = [];
    const start = Buffer.concat([utxoPrefix, Buffer.alloc(4), Buffer.alloc(1)])
    const stop = Buffer.concat([utxoPrefix, Buffer.from("ffffffff", 'hex'), Buffer.from("ff", 'hex')])
    levelDB.createReadStream({gte: start,
                                lte: stop,
                                reversed:true})
    .on('data', function (data) {
        if (address.equals(data.value.slice(9,29))){

            const txBinArray = sliceRawBufferForTx(data.value)
            const ptx = new PlasmaTransaction(txBinArray);
            utxos.push({
                blockNumber: data.key.slice(4, 8).readUInt32BE(0),
                txInBlock: data.key.slice(8,9).readUInt8(0),
                tx: ptx.toJSON() 
            })
        }
    })
    .on('error', function (err) {
      console.log('Oh my!', err)
      cb(err, null)
    })
    .on('close', function () {
        // cb(null, utxos)
      console.log('Stream closed')
    })
    .on('end', function () {
        cb(null, utxos)
      console.log('Stream ended')
    })
}

function sliceRawBufferForTx(buf){
    assert(buf.length == 94);
    const txBinArray = [buf.slice(0,4), buf.slice(4,5), buf.slice(5,9), buf.slice(9,29), buf.slice(29,30), buf.slice(30,62), buf.slice(62,94)]
    return txBinArray;
}

async function createDummyBlock(){
    if (lastBlock.readUInt32BE(0) == 0x00000000) {
 
        for (let i=0; i< 42; i++) {  
            const buff = Buffer(1)
            buff.writeUInt8(i);
            const txParams = {
                blockNumber: "0x00000000",
                txInBlock: '0x'+buff.toString('hex'),
                assetId: '0x00000000',
                to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'), 
              }
            const tx = new PlasmaTransaction(txParams);
            tx.sign(privKeys[0]); 
            txParamsFIFO.push(tx);
        }
        await createBlock();
    }
}

// app.use(router);

app.listen(port, async () => {
  // await testBTC();
  // await testLTC();
  // await testWAVES();
  // await testBCH();
  console.log('We are live on ' + port);
  console.log('0x'+ethUtil.privateToAddress(privKeys[0]).toString('hex'))
  console.log('0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'))
  console.log("Operator address = 0x"+ ethUtil.privateToAddress(plasmaOperatorPrivKey).toString('hex'))
  const txHashPrefix = ethUtil.toBuffer('\u0019Ethereum Signed Message:\n' + 94).toString('hex')
  console.log("Personal message prefix for tx (len 94) = " + txHashPrefix + ", byte lengths = " + txHashPrefix.length/2)
  blockMiningTimer = setTimeout(async () => {
    tryToMine()
  }, 1000);
  console.log('started mining');
//   const tx = createTx(
//         {
//             blockNumber: "0x00000001",
//             txInBlock: "0x00",
//             assetId: "0x00000000",
//             to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex')
//         },
//         privKeys[0]
//     )
//   console.log("Test TX ")  
//   console.log(JSON.stringify(tx))
  await startVM();
  await comp();
  await populateAccounts();
  await deployContracts()();
//   const block = await getBlockByNumber(1);
//   await submitBlockHeader(block)();
  try{
    lastBlock = await levelDB.get('lastBlockNumber');
  }
  catch(error) {
      lastBlock = Buffer.alloc(4)
      lastBlock.writeUInt32BE(0,0);
      await levelDB.put('lastBlockNumber', lastBlock);
  }
  try{
    lastBlockHash = await levelDB.get('lastBlockHash');
    }
    catch(error) {
        lastBlockHash = ethUtil.sha3('bankex.com')
        await levelDB.put('lastBlockHash', lastBlockHash);
    }
    // await createDummyBlock();
  app._router.stack.forEach(function(r){
  if (r.name && r.name == 'bound dispatch'){
      console.log(r.route.path)
    //   const routes = r.handle.stack;
    //   routes.forEach((ro) => {
    //     console.log(ro.route.path);
    //   })
      }
    })
  });             
