'use strict'
const ethUtil = require('ethereumjs-util');
const BN = ethUtil.BN
const PlasmaTransaction = require('../Tx/tx');
const MerkleTools = require('../merkle-tools');
const BlockHeader = require('./header'); 
const assert = require('assert');

// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16);

class Block {
  constructor (data) {
      if (data instanceof Object && data.constructor === Object ){ 
    this.blockNumber = data.blockNumber || Buffer.alloc(4);
    this.parentHash = data.parentHash || Buffer.alloc(32);
    // this._merkleRoot = Buffer.alloc(32);
    this.transactions = data.transactions || [];
    // assert(this.transactions && Array.isArray(this.transactions), "TXs should be an array");
    for (var i = this.transactions.length; i < 64; i++) {
        // this.transactions.push(new PlasmaTransaction({txInBlock: i}));
        this.transactions.push(new PlasmaTransaction(null));
    }
    assert(this.transactions.length === 64);
    const treeOptions = {
        hashType: 'sha3'
      }
      
    this.merkleTree = new MerkleTools(treeOptions)
    for (var i = 0; i < this.transactions.length; i++) {
        this.merkleTree.addLeaf(this.transactions[i].hash(true));
    }  
    assert (this.merkleTree.getLeafCount() == 64);
    this.merkleTree.makeTree(false);
    const rootValue = this.merkleTree.getMerkleRoot();
    // console.log(this.merkleTree.getProof(4) )
    const headerParams = {
        blockNumber: this.blockNumber,
        parentHash: this.parentHash,
        merkleRootHash: rootValue
    }
    this.header = new BlockHeader(headerParams);
    } else if (Buffer.isBuffer(data)) {
        this.transactions = [];
        const expectedLength = 133 + 64*94;
        assert(data.length == 133 + 64*94);
        const head = data.slice(0, 133);
        const headerArray = [head.slice(0,4), head.slice(4,36), head.slice(36,68), head.slice(68,69), head.slice(69,101), head.slice(101,133) ]
        this.header = new BlockHeader(headerArray);
        for (var i = 0; i < 64; i++) {
            const txBin = data.slice(133 + i*94, 133 + i*94 + 94)
            const txBinArray = [txBin.slice(0,4), txBin.slice(4,5), txBin.slice(5,9), txBin.slice(9,29), txBin.slice(29,30), txBin.slice(30,62), txBin.slice(62,94)]
            const tx = new PlasmaTransaction(txBinArray);
            this.transactions.push(tx); 
        }
        const treeOptions = {
            hashType: 'sha3'
          }
        this.merkleTree = new MerkleTools(treeOptions)
        for (var i = 0; i < this.transactions.length; i++) {
            this.merkleTree.addLeaf(this.transactions[i].hash(true));
        }  
        assert (this.merkleTree.getLeafCount() == 64);
        this.merkleTree.makeTree(false);
        const rootValue = this.merkleTree.getMerkleRoot();
        assert(  rootValue.equals(this.header.merkleRootHash))
        assert(this.header.validate());
        // console.log(this.merkleTree.getProof(4) )
    }
    Object.defineProperty(this, 'from', {
      enumerable: true,
      configurable: true,
      get: this.getSenderAddress.bind(this)
    })

    Object.defineProperty(this, 'raw', {
        get: function () {
        return this.serialize(false)
        }
    })
    
}

   
  serialize(includeSignature) {
      var txRaws = [];
      this.transactions.forEach((tx) => {
          txRaws.push(Buffer.concat(tx.raw))
      })
      return this.header.raw.concat(txRaws);
  }  



  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
      return this.header.hash(includeSignature)
  }

  /**
   * returns the sender's address
   * @return {Buffer}
   */
  getSenderAddress () {
      return this.header.getSenderAddress()
  }

  /**
   * returns the public key of the sender
   * @return {Buffer}
   */
  getSenderPublicKey () {
      return this.header._senderPubKey
  }

  getMerkleHash () {
    return this.header.merkleRootHash;
  }

  /**
   * Determines if the signature is valid
   * @return {Boolean}
   */
  verifySignature () {
      return this.header.verifySignature()
  }

  /**
   * sign a transaction with a given a private key
   * @param {Buffer} privateKey
   */
  sign (privateKey) {
      this.header.sign(privateKey)
  }


  /**
   * validates the signature and checks to see if it has enough gas
   * @param {Boolean} [stringError=false] whether to return a string with a dscription of why the validation failed or return a Bloolean
   * @return {Boolean|String}
   */
  validate (stringError) {
    const errors = []
    if (!this.verifySignature()) {
      errors.push('Invalid Signature')
    }
    if (stringError === undefined || stringError === false) {
      return errors.length === 0
    } else {
      return errors.join(' ')
    }
  }

}

Block.prototype.toJSON = function (labeled) {
    if (labeled) {
      var obj = {
        header: this.header.toJSON(true),
        transactions: []
      }
  
      this.transactions.forEach(function (tx) {
        obj.transactions.push(tx.toJSON(labeled))
      })
  
      return obj
    } else {
      return ethUtil.baToJSON(this.raw)
    }
  }

module.exports = Block