pragma solidity ^0.4.17;


contract PlasmaParent {
    
    address public owner = msg.sender;
    address public operator = msg.sender;
    uint32 public blockHeaderLength = 133;
    
    uint256 public lastBlockNumber = 0;
    uint256 public lastEthBlockNumber = block.number;
    uint256 public depositCounterInBlock = 64;
    
    struct Header{
        bytes4 blockNumber;
        bytes32 previousBlockHash;
        bytes32 merkleRootHash;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    struct DepositRecord{
        address from; 
        uint256 amount;
    } 
    struct WithdrawRecord{
        bytes4 blockNumber;
        uint8 txIdInBlock;
        address beneficiary;
        uint256 timestamp;
    }
    mapping (uint256 => mapping(uint256 => DepositRecord)) public depositRecords;
    mapping (uint256 => mapping(uint256 => WithdrawRecord)) public withdrawRecords;
    mapping (uint256 => Header) public headers;
    event DepositEvent(address indexed _from, uint256 indexed _amount, uint256 indexed _duringBlock);
    event WithdrawStartedEvent(address indexed _from, 
                                bytes4 indexed _blockNumber,
                                uint8 indexed _txIdInBlock);
    event WithdrawRequestAcceptedEvent(address indexed _from, 
                                uint256 indexed _ethBlockNumber,
                                uint256 indexed _withdrawIndex);
    event WithdrawFinalizedEvent(address indexed _to, 
                                uint256 indexed _ethBlockNumber,
                                uint256 indexed _withdrawIndex);                     
    // event Debug(bool indexed _success, bytes32 indexed _b, address indexed _signer);
    // event SigEvent(address indexed _signer, bytes32 indexed _r, bytes32 indexed _s);

    function extract32(bytes data, uint pos) pure internal returns (bytes32 result)
    { 
        for (uint i=0; i < 32;i++)
            result^=(bytes32(0xff00000000000000000000000000000000000000000000000000000000000000)&data[i+pos])>>(i*8);
    }
    
    function extract20(bytes data, uint pos) pure internal returns (bytes20 result)
    { 
        for (uint i=0; i < 20;i++)
            result^=(bytes20(0xff00000000000000000000000000000000000000)&data[i+pos])>>(i*8);
    }
    
   function extract4(bytes data, uint pos) pure internal returns (bytes4 result)
    { 
        for (uint i=0; i < 4;i++)
            result^=(bytes4(0xff000000)&data[i+pos])>>(i*8);
    }
    
    function extract1(bytes data, uint pos) pure internal returns (bytes1  result)
    { 
        for (uint i=0; i < 1; i++)
            result^=(bytes1(0xff)&data[i+pos])>>(i*8);
    }    
    
    function submitBlockHeader(bytes header) public returns (bool success) {
        require(msg.sender == operator);
        require(header.length == blockHeaderLength);
        bytes4 blockNumber = extract4(header, 0);
        bytes32 previousBlockHash = extract32(header, 4);
        bytes32 merkleRootHash = extract32(header, 36);
        uint8 v = uint8(extract1(header, 68));
        bytes32 r = extract32(header, 69);
        bytes32 s = extract32(header, 101);
        uint256 newBlockNumber = uint256(uint32(blockNumber));
 
        require(newBlockNumber == lastBlockNumber+1);
        if (lastBlockNumber != 0) {
            Header storage previousHeader = headers[lastBlockNumber];
            bytes32 previousHash = keccak256(previousHeader.blockNumber, previousHeader.previousBlockHash, previousHeader.merkleRootHash,
                                                previousHeader.v, previousHeader.r,previousHeader.s);
            require(previousHash == previousBlockHash);
        }
        bytes32 newBlockHash = keccak256(blockNumber, previousBlockHash, merkleRootHash);
        if (v < 27) {
            v = v+27; 
        }
        address signer = ecrecover(newBlockHash, v, r, s);
        // SigEvent(signer, r, s);
        if (signer != operator) {
            revert();
        }
        Header memory newHeader = Header({
            blockNumber: blockNumber, 
            previousBlockHash: previousBlockHash,
            merkleRootHash: merkleRootHash,
            v: v,
            r: r, 
            s: s
        });
        lastBlockNumber = lastBlockNumber+1;
        headers[lastBlockNumber] = newHeader;
        // depositCounterInBlock = 64;
        return true;
    }
    
    function checkProof(bytes32 root, bytes32 hash, bytes proof) pure public returns (bool) {
        bytes32 elProvided;
        bytes32 h = hash;
        uint8 rightElementProvided;
        uint32 loc;
        uint32 elLoc;
        for (uint32 i = 32; i <= uint32(proof.length); i += 33) {
            assembly {
                loc  := proof 
                elLoc := add(loc, add(i, 1))
                elProvided := mload(elLoc)
            }
            rightElementProvided = uint8(bytes1(0xff)&proof[i-32]);
            if (rightElementProvided > 0) {
                h = keccak256(h, elProvided);
            } else {
                h = keccak256(elProvided, h);
            }
        }
        return h == root;
      }
    
    function deposit() payable public returns (bool success) {
        require(msg.value == (1 ether)/10);
        DepositRecord memory newRecord = DepositRecord({
            from: msg.sender,
            amount: msg.value
        });
        if (block.number != lastEthBlockNumber) {
            depositCounterInBlock = 64;
        }
        depositRecords[block.number][depositCounterInBlock] = newRecord;
        depositCounterInBlock = depositCounterInBlock + 1;
        DepositEvent(msg.sender, msg.value, block.number);
        return true;
    }
    
    function startWithdraw(uint32 plasmaBlockNumber, 
                            uint8 plasmaBlockTxId, 
                            bytes plasmaTransaction, 
                            bytes merkleProof) 
    public returns(bool success, uint256 blockNumber, uint256 withdrawIndex) {
        require(uint32(header.blockNumber) > 0);
        Header storage header = headers[uint256(plasmaBlockNumber)];
        bytes32 merkleRoot = header.merkleRootHash;
        bytes28 txHashPrefix = 0x19457468657265756d205369676e6564204d6573736167653a0a3934;
        bytes32 txHash = keccak256(txHashPrefix, plasmaTransaction);
        bool validProof = checkProof( merkleRoot, txHash, merkleProof);
        // Debug(validProof, txHash, msg.sender);
        // Debug(true, merkleRoot, 0);
        require(validProof);
        address txOwner = address(extract20(plasmaTransaction,9));
        require(txOwner == msg.sender);
        WithdrawRecord memory newRecord = WithdrawRecord({
            blockNumber: bytes4(plasmaBlockNumber),
            txIdInBlock: plasmaBlockTxId,
            beneficiary: txOwner,
            timestamp: now
        });
        withdrawIndex = uint256(plasmaBlockNumber)*8 + uint256(plasmaBlockTxId);
        withdrawRecords[block.number][withdrawIndex] = newRecord;
        WithdrawStartedEvent(msg.sender, bytes4(plasmaBlockNumber), plasmaBlockTxId);
        WithdrawRequestAcceptedEvent(msg.sender, block.number, withdrawIndex);
        return (true, block.number, withdrawIndex);
    } 
    
    function finalizeWithdraw(uint256 withdrawEthBlockNumber, uint256 withdrawIndex) 
    public returns(bool success) {
        WithdrawRecord storage record = withdrawRecords[withdrawEthBlockNumber][withdrawIndex];
        require(now >= record.timestamp + (24 hours));
        address to = record.beneficiary;
        delete withdrawRecords[withdrawEthBlockNumber][withdrawIndex];
        WithdrawFinalizedEvent(to, withdrawEthBlockNumber, withdrawIndex);
        to.transfer((1 ether)/10);
        return true;
    } 
    
    }
