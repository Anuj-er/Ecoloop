// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EcoLoopEscrow
 * @dev Simple escrow contract for marketplace transactions
 */
contract EcoLoopEscrow {
    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        string itemId;
        bool isDelivered;
        bool isCompleted;
        uint256 createdAt;
    }
    
    mapping(string => Escrow) public escrows;
    mapping(address => uint256) public balances;
    
    event EscrowCreated(string itemId, address buyer, address seller, uint256 amount);
    event DeliveryConfirmed(string itemId, address buyer);
    event EscrowCompleted(string itemId, address seller, uint256 amount);
    event FundsWithdrawn(address user, uint256 amount);
    
    modifier onlyBuyer(string memory _itemId) {
        require(escrows[_itemId].buyer == msg.sender, "Only buyer can call this function");
        _;
    }
    
    modifier escrowExists(string memory _itemId) {
        require(escrows[_itemId].buyer != address(0), "Escrow does not exist");
        _;
    }
    
    modifier notCompleted(string memory _itemId) {
        require(!escrows[_itemId].isCompleted, "Escrow already completed");
        _;
    }
    
    /**
     * @dev Create a new escrow
     * @param _seller The seller's address
     * @param _itemId The unique item identifier
     */
    function createEscrow(address _seller, string memory _itemId) 
        external 
        payable 
    {
        require(msg.value > 0, "Must send ETH to create escrow");
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be the same");
        require(escrows[_itemId].buyer == address(0), "Escrow already exists for this item");
        
        escrows[_itemId] = Escrow({
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            itemId: _itemId,
            isDelivered: false,
            isCompleted: false,
            createdAt: block.timestamp
        });
        
        emit EscrowCreated(_itemId, msg.sender, _seller, msg.value);
    }
    
    /**
     * @dev Confirm delivery and release funds to seller
     * @param _itemId The item identifier
     */
    function confirmDelivery(string memory _itemId) 
        external 
        onlyBuyer(_itemId)
        escrowExists(_itemId)
        notCompleted(_itemId)
    {
        Escrow storage escrow = escrows[_itemId];
        
        escrow.isDelivered = true;
        escrow.isCompleted = true;
        
        balances[escrow.seller] += escrow.amount;
        
        emit DeliveryConfirmed(_itemId, msg.sender);
        emit EscrowCompleted(_itemId, escrow.seller, escrow.amount);
    }
    
    /**
     * @dev Withdraw available balance
     */
    function withdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(msg.sender, balance);
    }
    
    /**
     * @dev Get escrow details
     * @param _itemId The item identifier
     */
    function getEscrowDetails(string memory _itemId) 
        external 
        view 
        returns (
            address buyer,
            address seller,
            uint256 amount,
            bool isDelivered,
            bool isCompleted,
            uint256 createdAt
        ) 
    {
        Escrow memory escrow = escrows[_itemId];
        return (
            escrow.buyer,
            escrow.seller,
            escrow.amount,
            escrow.isDelivered,
            escrow.isCompleted,
            escrow.createdAt
        );
    }
    
    /**
     * @dev Emergency function to refund buyer (only within 7 days and if not delivered)
     * @param _itemId The item identifier
     */
    function emergencyRefund(string memory _itemId) 
        external 
        onlyBuyer(_itemId)
        escrowExists(_itemId)
        notCompleted(_itemId)
    {
        Escrow storage escrow = escrows[_itemId];
        
        // Allow refund only within 7 days
        require(block.timestamp <= escrow.createdAt + 7 days, "Refund period expired");
        require(!escrow.isDelivered, "Cannot refund after delivery confirmation");
        
        escrow.isCompleted = true;
        
        (bool success, ) = payable(msg.sender).call{value: escrow.amount}("");
        require(success, "Refund failed");
        
        emit FundsWithdrawn(msg.sender, escrow.amount);
    }
    
    /**
     * @dev Get user's available balance
     * @param _user The user's address
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }
}
