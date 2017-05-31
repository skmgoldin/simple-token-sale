pragma solidity 0.4.11;
import "./StandardToken.sol";

contract Sale {

    /*
     * Events
     */

    event PurchasedTokens(address purchaser, uint amount);

    /*
     * Storage
     */

    address public owner;
    address public wallet;
    StandardToken public token;
    uint public price;
    uint public startBlock;

    /*
     * Modifiers
     */

    modifier saleStarted {
        require(block.number >= startBlock || msg.sender == owner);
        _;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    /*
     * Public functions
     */

    /// @dev Sale(): constructor for Sale contract
    /// @param _owner the address which owns the sale, can access owner-only functions
    /// @param _wallet the sale's beneficiary address 
    /// @param _token the address of the ERC20 token being sold
    /// @param _price price of the token in Wei (ADT/Wei pair price)
    /// @param _startBlock the block at which this contract will begin selling its ADT balance
    function Sale(address _owner,
                  address _wallet,
                  StandardToken _token,
                  uint _price,
                  uint _startBlock) {
        owner = _owner;
        wallet = _wallet;
        token = StandardToken(_token);
        price = _price;
        startBlock = _startBlock;
    }

    /// @dev purchaseToken(): function that exchanges ETH for ADT (main sale function)
    /// @notice You're about to purchase the equivalent of `msg.value` Wei in ADT tokens
    function purchaseTokens()
        saleStarted
        payable
    {
        uint excessAmount = msg.value % price;
        uint purchaseAmount = msg.value - excessAmount;
        uint tokenPurchase = purchaseAmount / price;

        require(tokenPurchase <= token.balanceOf(this));

        if (excessAmount > 0) {
            msg.sender.transfer(excessAmount);
        }

        wallet.transfer(purchaseAmount);

        require(token.transfer(msg.sender, tokenPurchase));

        PurchasedTokens(msg.sender, tokenPurchase);
    }

    /*
     * Owner-only functions
     */

    function changeOwner(address _newOwner)
        onlyOwner
    {
        owner = _newOwner;
    }

    function changePrice(uint _newPrice)
        onlyOwner
    {
        price = _newPrice;
    }

    function changeStartBlock(uint _newBlock)
        onlyOwner
    {
        startBlock = _newBlock;
    }

    function emergencyStop()
        onlyOwner
    {
        startBlock = (2**256) - 1;
    }
}
