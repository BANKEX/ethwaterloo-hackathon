var abi = [ { "constant": true, "inputs": [], "name": "index", "outputs": [ { "name": "", "type": "uint8", "value": "0" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "kill", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [ { "name": "", "type": "address", "value": "0x0de82290b1ac2c29f2dd2b7731ccac5f107c53bd" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "Deposit", "outputs": [ { "name": "", "type": "uint8" } ], "payable": true, "stateMutability": "payable", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" } ];
var contractAaddress = '0xeB5cF932B47ef7236D621991AF1be2f0448644A6';
var web3;
var plasmaContractInstance;

setTimeout(function () {
	web3 = new Web3(web3.currentProvider);
	PlasmaContract = web3.eth.contract(abi);
	plasmaContractInstance = PlasmaContract.at(contractAaddress);
}, 500);

var address;
var ethBalance = 123;

var heroes = [
	{ title: 'Wonder Woman', desc: '1941', img: 'wonder-woman.jpg' },
	{ title: 'Superman', desc: '1938', img: 'superman.jpg' },
	{ title: 'Green Lantern', desc: '1940', img: 'green-lantern.jpg' },
	{ title: 'Batman', desc: '1939', img: 'batman.jpg' },
];

var collectedHeroes = [];

$(document).ready(function () {
	updateBalances();
	getAccountAddress();

	$('#btn-deposit').click(function () {
		$('#no-eth-transactions').addClass('hidden');

		var ul = $('#list-eth-transactions');
		ul.removeClass('hidden');
		
		var li = $('<li class="list-group-item list-group-item-primary" style="display: none;">\
			<div class="row justify-content-md-center">\
				<div class="col-md-auto">\
					<div class="text">\
						<i class="fa fa-spinner fa-spin fa-fw"></i>\
					</div>\
				</div>\
			</div>\
		</li>');

		li.appendTo(ul).fadeIn(500);

		var methodSignature = plasmaContractInstance.Deposit.getData();
    	var amount = web3.toWei(0.1, 'ether');

    	var post_request = {
			to: contractAaddress,
			value: amount,
			data: methodSignature
		};

		web3.eth.sendTransaction(
			post_request,
			function(err, transactionHash) {
				if (!err) {
					li.html('<div class="row">\
						<div class="col-md-auto">\
							<div class="text text-muted">'
								+ moment().format("MM/DD/YYYY HH:mm:SS") + 
							'</div>\
						</div>\
						<div class="col-md-auto">\
							<div class="text text-right">\
								0.1&nbsp;<span class="text-muted">ETH</span> <i class="fa fa-arrow-circle-right"></i>\
							</div>\
						</div>\
					</div>\
					<div class="row">\
						<div class="col">\
							<div class="text text-sm">'
							+ address +
							'</div>\
						</div>\
					</div>');

					$("#no-plasma-assets").addClass("hidden");

					buyHeroes(1);

					ethBalance -= 1;
					updateBalances();
				} else {
					li.addClass("list-group-item-danger").html('<div class="row">\
						<div class="col-md-auto">\
							<div class="text text-muted">'
								+ moment().format("MM/DD/YYYY HH:mm:SS") + 
							'</div>\
						</div>\
						<div class="col-md-auto">\
							<div class="text text-right">\
								Error\
							</div>\
						</div>\
					</div>');

					$("#no-plasma-assets").addClass("hidden");
				}
			}
		);
	});

	$('#btn-deposit-3').click(function () {
		$('#no-eth-transactions').addClass('hidden');

		var ul = $('#list-eth-transactions');
		ul.removeClass('hidden');
		
		var li = $('<li class="list-group-item list-group-item-primary" style="display: none;">\
			<div class="row justify-content-md-center">\
				<div class="col-md-auto">\
					<div class="text">\
						<i class="fa fa-spinner fa-spin fa-fw"></i>\
					</div>\
				</div>\
			</div>\
		</li>');

		li.appendTo(ul).fadeIn(500);

		var methodSignature = plasmaContractInstance.Deposit.getData();
    	var amount = web3.toWei(0.3, 'ether');

    	var post_request = {
			to: contractAaddress,
			value: amount,
			data: methodSignature
		};

		web3.eth.sendTransaction(
			post_request,
			function(err, transactionHash) {
				if (!err) {
					li.html('<div class="row">\
						<div class="col-md-auto">\
							<div class="text text-muted">'
								+ moment().format("MM/DD/YYYY HH:mm:SS") + 
							'</div>\
						</div>\
						<div class="col-md-auto">\
							<div class="text text-right">\
								0.3&nbsp;<span class="text-muted">ETH</span> <i class="fa fa-arrow-circle-right"></i>\
							</div>\
						</div>\
					</div>\
					<div class="row">\
						<div class="col">\
							<div class="text text-sm">'
							+ address +
							'</div>\
						</div>\
					</div>');

					$("#no-plasma-assets").addClass("hidden");

					buyHeroes(3);

					ethBalance -= 3;
					updateBalances();
				} else {
					li.addClass("list-group-item-danger").html('<div class="row">\
						<div class="col-md-auto">\
							<div class="text text-muted">'
								+ moment().format("MM/DD/YYYY HH:mm:SS") + 
							'</div>\
						</div>\
						<div class="col-md-auto">\
							<div class="text text-right">\
								Error\
							</div>\
						</div>\
					</div>');

					$("#no-plasma-assets").addClass("hidden");
				}
			}
		);
	});
	
	$('.btn-withdraw').click(onWithdraw);
});

function getHero() {
	return heroes[Math.floor(Math.random() * heroes.length)];
}

function buyHeroes(count) {
	var collectionPlasma = $("#list-plasma-assets");
	collectionPlasma.removeClass("hidden");

	for (var i = 0; i < count; i++) {
		var hero = getHero();

		if (collectedHeroes.indexOf(hero.title) === -1) {
			collectedHeroes.push(hero.title);
			updateBalances();
		}

		var cardPlasma = $('<div class="col-md-3">\
			<div class="card hero">\
				<img class="card-img-top" src="/img/heroes/' + hero.img +'" alt="">\
				<div class="card-body">\
					<h5 class="card-title">' + hero.title + '</h5>\
					<p class="card-text">' + hero.desc + '</p>\
					<div class="row">\
						<div class="col-sm-4">\
							<button type="button" class="btn btn-sm btn-success btn-block" id="btn-withdraw" onclick="onWithdraw(this)"><i class="fa fa-arrow-circle-left"></i></button>\
						</div>\
						<div class="col-sm-8">\
							<button type="button" class="btn btn-sm btn-info btn-block" id="btn-send-offchain" onclick="onExchange(this)"><i class="fa fa-refresh"></i> Exchange</button>\
						</div>\
					</div>\
				</div>\
			</div>\
		</div>');

		cardPlasma.appendTo(collectionPlasma).fadeIn(500);
	}
}

function updateBalances() {
	$("#eth-balance").text((ethBalance / 10.0).toFixed(1));
	$("#heroes-count").text(collectedHeroes.length);
	$("#heroes-total").text(heroes.length);

	if (heroes.length == collectedHeroes.length) {
		$('#my-cards').addClass('bg-success');
	}
}

function onWithdraw(sender) {
	$("#no-plasma-assets").addClass("hidden");

	var ul = $("#list-plasma-assets");
	ul.removeClass("hidden");

	var ul = $("#list-eth-transactions");

	var li = $('<li class="list-group-item list-group-item-success" style="display: none;">\
		<div class="row justify-content-md-center">\
			<div class="col-md-auto">\
				<div class="text">\
					<i class="fa fa-spinner fa-spin fa-fw"></i>\
				</div>\
			</div>\
		</div>\
	</li>');

	li.appendTo(ul).fadeIn(500);

	var cardPlasma = $(sender).parents('li');
	cardPlasma.addClass('disabled');

	setTimeout(function () {
		li.html('<div class="row">\
			<div class="col-md-auto">\
				<div class="text text-muted">\
					10/14/2017 17:00:00\
				</div>\
			</div>\
			<div class="col">\
				<div class="text">\
					0x0000000000000000000000000000000000000001\
				</div>\
			</div>\
			<div class="col-md-auto">\
				<div class="text">\
					<i class="fa fa-arrow-circle-up"></i> 0.1&nbsp;<span class="text-muted">ETH</span>\
				</div>\
			</div>\
		</div>');

		cardPlasma.fadeOut(500, function () {
			cardPlasma.remove();

			var collectionPlasma = $("#list-plasma-assets");

			if (collectionPlasma.children().length === 0)
				$("#no-plasma-assets").removeClass("hidden");
		});

		ethBalance += 1;
		updateBalances();
	}, 1500);
}

function onExchange(sender) {
	$("#no-plasma-assets-others").addClass("hidden");

	var cardPlasma = $(sender).parents('li');
	cardPlasma.addClass('disabled');
	cardPlasma.fadeOut(500, function () {
		cardPlasma.remove();

		var collectionPlasma = $("#list-plasma-assets");

		if (collectionPlasma.children().length === 0)
			$("#no-plasma-assets").removeClass("hidden");
	});

	var collectionPlasmaOthers = $("#list-plasma-assets-others");
	collectionPlasmaOthers.removeClass("hidden");

	var cardPlasmaOthers = $('<li class="list-group-item list-group-item-secondary" style="display: none;">\
		<div class="row justify-content-md-center">\
			<div class="col-md-auto">\
				<div class="text">\
					<i class="fa fa-spinner fa-spin fa-fw"></i>\
				</div>\
			</div>\
		</div>\
	</li>');

	cardPlasmaOthers.appendTo(collectionPlasmaOthers).fadeIn(500);
	
	setTimeout(function () {
		cardPlasmaOthers.html('<div class="row">\
			<div class="col-md-auto">\
				<div class="text text-muted">\
					10/14/2017 17:00:00\
				</div>\
			</div>\
			<div class="col">\
				<div class="text">\
					0x0000000000000000000000000000000000000001\
				</div>\
			</div>\
		</div>');

		updateBalances();
	}, 300);
}

function getAccountAddress() {
	setTimeout(function () {
		if (typeof web3 !== 'undefined') {
			web3.version.getNetwork(function (err, netId) {
				if (netId === "4") { //Rinkeby
					web3.eth.getAccounts(function (err, accounts) {
						address = accounts[0];
						$("#eth-address").text(address);
					});
				}
				else {
					alert("Please enable Rinkeby network");
				}
			});
		}
		else {
			alert("Please install MetaMask");
		}
	}, 100);
}