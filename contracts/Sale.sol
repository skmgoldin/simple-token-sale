pragma solidity 0.4.11;
import "./StandardToken.sol";

contract Sale {

    event PurchasedTokens(address purchaser, uint amount);

    address public owner;
    address public wallet;
    StandardToken public token;
    uint public price;
    uint public startBlock;

    modifier saleStarted {
        require(block.number >= startBlock || msg.sender == owner);
        _;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

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

        if(!wallet.send(purchaseAmount)) { throw; }

        require(token.transfer(msg.sender, tokenPurchase));

        PurchasedTokens(msg.sender, tokenPurchase);
    }

    /********************************** 
     ** Owner-only utility functions **
     **********************************/

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
