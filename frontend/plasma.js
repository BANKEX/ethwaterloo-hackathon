var MongoClient = require('mongodb').MongoClient;

MongoClient.connect('mongodb://mongo:27017/plasma', function(err, db) {
	if (!err) {
		console.log("Connected to mongo server OK");

		exports.sendTransaction = function (data, resolve, reject) {
			resolve("ok");
		}

		exports.getTransactions = function () {
			var transactions = [];

			transactions.push({ blockNumber: 1234, newOwner: "0x0000000000000000000000000000000000000000" });
			transactions.push({ blockNumber: 5678, newOwner: "0x0000000000000000000000000000000000000001" });

			return transactions;
		}
	}
});