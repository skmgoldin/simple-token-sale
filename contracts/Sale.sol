pragma solidity ^0.4.11;
import "tokens/HumanStandardToken.sol";
import "./Disbursement.sol";

contract Sale {

    /*
     * Events
     */

    event PurchasedTokens(address indexed purchaser, uint amount);
    event TransferredPreBuyersReward(address indexed preBuyer, uint amount);
    event TransferredTimelockedTokens(address beneficiary, address disburser, uint amount);

    /*
     * Storage
     */

    address public owner;
    address public wallet;
    HumanStandardToken public token;
    uint public price;
    uint public startBlock;
    uint public freezeBlock;

    uint public totalPreBuyers;
    uint public preBuyersDispensedTo = 0;
    uint public totalTimelockedBeneficiaries;
    uint public timeLockedBeneficiariesDisbursedTo = 0;

    bool public emergencyFlag = false;
    bool public preSaleTokensDisbursed = false;
    bool public timelockedTokensDisbursed = false;

    /*
     * Modifiers
     */

    modifier saleStarted {
        require(block.number >= startBlock);
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

    modifier setupComplete {
        assert(preSaleTokensDisbursed && timelockedTokensDisbursed);
        _;
    }

    modifier notInEmergency {
        assert(emergencyFlag == false);
        _;
    }

    /*
     * Public functions
     */

    /// @dev Sale(): constructor for Sale contract
    /// @param _owner the address which owns the sale, can access owner-only functions
    /// @param _wallet the sale's beneficiary address 
    /// @param _tokenSupply the total number of tokens to mint
    /// @param _tokenName the token's human-readable name
    /// @param _tokenDecimals the number of display decimals in token balances
    /// @param _tokenSymbol the token's human-readable asset symbol
    /// @param _price price of the token in Wei
    /// @param _startBlock the block at which this contract will begin selling its token balance
    function Sale(
        address _owner,
        address _wallet,
        uint256 _tokenSupply,
        string _tokenName,
        uint8 _tokenDecimals,
        string _tokenSymbol,
        uint _price,
        uint _startBlock,
        uint _freezeBlock,
        uint _totalPreBuyers,
        uint _totalTimelockedBeneficiaries
    ) {
        owner = _owner;
        wallet = _wallet;
        token = new HumanStandardToken(_tokenSupply, _tokenName, _tokenDecimals, _tokenSymbol);
        price = _price;
        startBlock = _startBlock;
        freezeBlock = _freezeBlock;
        totalPreBuyers = _totalPreBuyers;
        totalTimelockedBeneficiaries = _totalTimelockedBeneficiaries;

        token.transfer(this, token.totalSupply());
        assert(token.balanceOf(this) == token.totalSupply());
        assert(token.balanceOf(this) == _tokenSupply);
    }

    /// @dev distributeFoundersRewards(): private utility function called by constructor
    /// @param _preBuyers an array of addresses to which awards will be distributed
    /// @param _preBuyersTokens an array of integers specifying preBuyers rewards
    function distributePreBuyersRewards(
        address[] _preBuyers,
        uint[] _preBuyersTokens
    ) 
        public
        onlyOwner
    { 
        assert(!preSaleTokensDisbursed);

        for(uint i = 0; i < _preBuyers.length; i++) {
            token.transfer(_preBuyers[i], _preBuyersTokens[i]);
            preBuyersDispensedTo += 1;
            TransferredPreBuyersReward(_preBuyers[i], _preBuyersTokens[i]);
        }

        if(preBuyersDispensedTo == totalPreBuyers) {
          preSaleTokensDisbursed = true;
        }
    }

    /// @dev distributeTimelockedRewards(): private utility function called by constructor
    // @param _founders an array of addresses specifying disbursement beneficiaries
    // @param _foundersTokens an array of integers specifying disbursement amounts
    // @param _founderTimelocks an array of UNIX timestamps specifying vesting dates
    function distributeTimelockedTokens(
        address[] _beneficiaries,
        uint[] _beneficiariesTokens,
        uint[] _timelocks,
        uint[] _periods
    ) 
        public
        onlyOwner
    { 
        assert(preSaleTokensDisbursed);
        assert(!timelockedTokensDisbursed);

        for(uint i = 0; i < _beneficiaries.length; i++) {
          address beneficiary = _beneficiaries[i];
          uint beneficiaryTokens = _beneficiariesTokens[i];

          Disbursement disbursement = new Disbursement(
            beneficiary,
            _periods[i],
            _timelocks[i]
          );
          
          disbursement.setup(token);
          token.transfer(disbursement, beneficiaryTokens);
          timeLockedBeneficiariesDisbursedTo += 1;

          TransferredTimelockedTokens(beneficiary, disbursement, beneficiaryTokens);
        }

        if(timeLockedBeneficiariesDisbursedTo == totalTimelockedBeneficiaries) {
          timelockedTokensDisbursed = true;
        }
    }

    /// @dev purchaseToken(): function that exchanges ETH for tokens (main sale function)
    /// @notice You're about to purchase the equivalent of `msg.value` Wei in tokens
    function purchaseTokens()
        saleStarted
        payable
        setupComplete
        notInEmergency
    {
        /* Calculate whether any of the msg.value needs to be returned to
           the sender. The tokenPurchase is the actual number of tokens which
           will be purchased once any excessAmount included in the msg.value
           is removed from the purchaseAmount. */
        uint excessAmount = msg.value % price;
        uint purchaseAmount = msg.value - excessAmount;
        uint tokenPurchase = purchaseAmount / price;

        // Cannot purchase more tokens than this contract has available to sell
        require(tokenPurchase <= token.balanceOf(this));

        // Return any excess msg.value
        if (excessAmount > 0) {
            msg.sender.transfer(excessAmount);
        }

        // Forward received ether minus any excessAmount to the wallet
        wallet.transfer(purchaseAmount);

        // Transfer the sum of tokens tokenPurchase to the msg.sender
        token.transfer(msg.sender, tokenPurchase);

        PurchasedTokens(msg.sender, tokenPurchase);
    }

    /*
     * Owner-only functions
     */

    function changeOwner(address _newOwner)
        onlyOwner
    {
        require(_newOwner != 0);
        owner = _newOwner;
    }

    function changePrice(uint _newPrice)
        onlyOwner
        notFrozen
    {
        require(_newPrice != 0);
        price = _newPrice;
    }

    function changeWallet(address _wallet)
        onlyOwner
        notFrozen
    {
        require(_wallet != 0);
        wallet = _wallet;
    }

    function changeStartBlock(uint _newBlock)
        onlyOwner
        notFrozen
    {
        require(_newBlock != 0);

        freezeBlock = _newBlock - (startBlock - freezeBlock);
        startBlock = _newBlock;
    }

    function emergencyToggle()
        onlyOwner
    {
        emergencyFlag = !emergencyFlag;
    }

}
