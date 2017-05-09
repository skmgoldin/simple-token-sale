pragma solidity 0.4.11;
import "./StandardToken.sol";

contract Sale {

    event PurchasedAdToken(address purchaser, uint amount);

    address public owner;
    address public wallet;
    StandardToken public token;
    uint public price;
    uint public startBlock;

    modifier saleStarted {
        if(block.number < startBlock && msg.sender != owner) { throw; }
        _;
    }

    modifier onlyOwner {
        if(msg.sender != owner) { throw; }
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

    function purchaseAdToken(uint _amount)
        saleStarted
        payable
    {
        if(_amount > token.balanceOf(this)) { throw; }
        if(msg.value != (price * _amount)) { throw; }

        if(!wallet.send(msg.value)) { throw; }

        if(!token.transfer(msg.sender, _amount)) { throw; }

        PurchasedAdToken(msg.sender, _amount);
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
