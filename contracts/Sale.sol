pragma solidity 0.4.11;
import "./HumanStandardToken.sol";
import "./Disbursement.sol";

contract Sale {

    /*
     * Events
     */

    event PurchasedTokens(address indexed purchaser, uint amount);
    event TransferredFoundersReward(address indexed founder, uint amount);
    event TransferredTimelockedTokens(
        address indexed timelockRecipient,
        Disbursement vault,
        uint amount
    );

    /*
     * Storage
     */

    address public owner;
    address public wallet;
    HumanStandardToken public token;
    uint public price;
    uint public startBlock;
    uint public freezeBlock;
    bool public emergencyFlag = false;

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

    modifier notFrozen {
        require(block.number < freezeBlock);
        _;
    }

    modifier notInEmergency {
        require(emergencyFlag == false);
        _;
    }

    /*
     * Public functions
     */

    /// @dev Sale(): constructor for Sale contract
    /// @param _owner the address which owns the sale, can access owner-only functions
    /// @param _wallet the sale's beneficiary address 
    /// @param _tokenSupply the total number of AdToken to mint
    /// @param _tokenName AdToken's human-readable name
    /// @param _tokenDecimals the number of display decimals in AdToken balances
    /// @param _tokenSymbol AdToken's human-readable asset symbol
    /// @param _price price of the token in Wei (ADT/Wei pair price)
    /// @param _startBlock the block at which this contract will begin selling its ADT balance
    /// @param _founders addresses of founders to receive initial token balances
    /// @param _foundersTokens amounts of tokens to transfer to founders
    function Sale(address _owner,
                  address _wallet,
                  uint256 _tokenSupply,
                  string _tokenName,
                  uint8 _tokenDecimals,
                  string _tokenSymbol,
                  uint _price,
                  uint _startBlock,
                  uint _freezeBlock,
                  address[] _founders,
                  uint[] _foundersTokens,
                  address[] _timelockRecipients,
                  uint[] _timelockTokens,
                  uint[] _timelockDates) {
        owner = _owner;
        wallet = _wallet;
        token = new HumanStandardToken(_tokenSupply, _tokenName, _tokenDecimals, _tokenSymbol);
        price = _price;
        startBlock = _startBlock;
        freezeBlock = _freezeBlock;

        token.transfer(this, token.totalSupply());
        if (token.balanceOf(this) != token.totalSupply()) throw;
        if (token.balanceOf(this) != 10**9) throw;

        distributeFoundersRewards(_founders, _foundersTokens);

        distributeTimelockedRewards(_timelockRecipients, _timelockTokens, _timelockDates);
    }

    function distributeFoundersRewards(address[] _founders, uint[] _foundersTokens) 
        private
    { 
        for(uint i = 0; i < _founders.length; i++) {
            token.transfer(_founders[i], _foundersTokens[i]);
            TransferredFoundersReward(_founders[i], _foundersTokens[i]);
        }

    }

    function distributeTimelockedRewards(
        address[] _timelockRecipients,
        uint[] _timelockTokens,
        uint[] _timelockDates) 
        private
    { 
        for(uint i = 0; i < _timelockRecipients.length; i++) {
            Disbursement vault = new Disbursement(_timelockRecipients[i], 0, _timelockDates[i]);
            token.transfer(vault, _timelockTokens[i]);
            TransferredTimelockedTokens(_timelockRecipients[i],
                                        Disbursement(vault),
                                        _timelockTokens[i]);
        }

    }

    /// @dev purchaseToken(): function that exchanges ETH for ADT (main sale function)
    /// @notice You're about to purchase the equivalent of `msg.value` Wei in ADT tokens
    function purchaseTokens()
        saleStarted
        payable
        notInEmergency
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
        notFrozen
    {
        price = _newPrice;
    }

    function changeStartBlock(uint _newBlock)
        onlyOwner
        notFrozen
    {
        startBlock = _newBlock;
    }

    function emergencyToggle()
        onlyOwner
    {
        emergencyFlag = !emergencyFlag;
    }
}
