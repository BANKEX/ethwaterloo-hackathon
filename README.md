# The Plasma-like Blockchain Exchange Network

## What?

The task is to make blockchain transactions as fast as they can be applied virtually to any application.

## How?

One of possible solutions is Plasma - the prominent upgrade to Ethereum blockchain. Our approach is based on this conception.

## User Story for the Demo Project

Let's apply this to the particular game, which is just one of thousands applications, but could be directly applied to some cases like promotional campaigns as well: **digital item collection exchange network**.

Say you have to collect some limited set of items like digital baseball cards. You can buy it on the open market but you have no ability to guess what particular item off the collection you will buy. And you want to have the ability to exchange repeated cards with other collectors. This exchange procedure are going to be held on side blockchain.

## Plasma Network Technical Concept

From technical point of view Plasma blockchain - is just another blockchain, that can be efficiently settled to parent Ethereum chain and is well protected from misbehavior of both Plasma operator and Plasma blockchain participats by smart-contract on Ethererum network.

Plasma chain itself has very simple structure with assets being undividable and transfered in full from previous owner to the next one. Transaction has fields of [BlockNumber, TxInBlock, AssetID, NewOwner, SenderSignature], where BlockNumber and TxInBlock refer to the previous transactions where "NewOwner" field was equal to "Sender". All chain logic is made using Ethereum crypto primitives - sha3, secp256k1 and 65 byte signatures allowing use of ecrecover.

Block in Plasma network has a structure of Header:[BlockNumber, ParentHash, MerkleTreeRoot, PlasmaOperatorSignature], where ParentHash references previous block (by number) and MerkleTreeRoot is root hash of a Merkle tree of 64 (fixed size block) of transacitons in this Plasma block and array of transactions. If there are less transactions in pull to be included, empty transactions (just a same length zero strings) are included for sake of simplicity.

Header is submitted by Plasma network operator to the smart-contract on Ethereum chain. Blocks can only be sent one by one, with sequence numbering is enforced by contract. Any user of Ethereum network can deposit 0.1 ETH (in this example) to contract that will trigger and event and will allow Plasma network operator to make a funding transaction in Plasma chain. Than users can freely transact in Plasma chain, with headers pushed to parent contract in Ethereum.

When user wants to settle one of his transactions to the main network, he starts a withdraw on Ethereum network by providing reference to the transaction (in a form of BlockNumber, TxId), full transaction and Merkle proof that this transaction was indeed included in that block. Parent contract checks a proof versus submittet root hash for this block and if it passed starts withdraw process. After 24 hours it can be finalized.

Crucial part that is not implemented (not trivial, but also not too difficult with Merkle proof checker already implemented) is a way to challange withdraw and not allow double spending. That can be done by any user (Plasma chain operator would have largest incentive to do it) and will allow to stop withdraw by sumbitting a proof that transaction refered by withdraw request was already spent in one of the blocks with headers already submitted by Plasma operator. Same set of rules should be implemented to be able to punish misbehavior of Plasma network operator himself.

## Technology in PoC

Concept is implemented using JS with conjuction on Web3 and Ethereumjs-Testrpc on a backend. For sake of simplicity all necessary functions are wrapped in REST API calls doing signatures on behalf of predefined set of address on a server, but proper implementation will allow users to use wallet apps such as Metamask to initiate transactions in a Plasma network by making a signature on a client side and interacting with a parent contract on Ethereum network as usual.

## Why Plasma

Here at BANKEX we believe in efficiency of offloading of some transactions from Ethereum blockchain to Plasma chains especially if proper incentive is present for Plasma operators to behave properly (such incentive can we even in a form of completing with other operators for obtaining end-users). Another advantage is a flexibility of Plasma chain implementation as long as it can be effectively cross-checked by contract on a parent chain. With new cryptographic primitived added in Metropolis fork one can extent our PoC implementation with more money-like transaction structure (1 -> 2 splits of UTXO) with transactions itself utilizing ring signatures of zkSNARKs for privacy of end user.

## PoC DApp

![Alt text](https://bankex.github.io/ethwaterloo-hackathon/presentation/presentation.png)

## Contributions

* [shamatar](https://github.com/shamatar)
* [dnx2k](https://github.com/dnx2k)



