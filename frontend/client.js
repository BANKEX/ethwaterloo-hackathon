const Eth = require('ethjs-query');
const EthContract = require('ethjs-contract');

function startApp(web3) {
	const eth = new Eth(web3.currentProvider);
	const contract = new EthContract(eth);
	initContract(contract);
}

const abi = [{
"constant": false,
"inputs": [
{
"name": "_to",
"type": "address"
},
{
"name": "_value",
"type": "uint256"
}
],
"name": "transfer",
"outputs": [
{
"name": "success",
"type": "bool"
}
],
"payable": false,
"type": "function"
}];

const address = '0xdeadbeef123456789000000000000';

function initContract(contract) {
	const PlasmaContract = contract(abi)
	const plasmaContract = PlasmaContract.at(address)
	listenForClicks(plasmaContract)
}

function listenForClicks(plasmaContract) {
	var button = document.querySelector('button.transferFunds');
	button.addEventListener('click', function() {
		plasmaContract.transfer(toAddress, value, { from: addr })
		.then(function (txHash) {
			console.log('Transaction sent')
			console.dir(txHash)
			waitForTxToBeMined(txHash)
		})
		.catch(console.error)
	})
}

async function waitForTxToBeMined(txHash) {
	let txReceipt;

	while (!txReceipt) {
		try {
			txReceipt = await eth.getTransactionReceipt(txHash);
		} catch (err) {
			return indicateFailure(err);
		}
	}
	
	indicateSuccess();
}

console.log('client.js loaded ok...');