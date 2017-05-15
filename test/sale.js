/*global web3 describe before artifacts assert it contract:true*/
const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

contract(`Sale`, (accounts) => {
  const saleConf = JSON.parse(fs.readFileSync(`./conf/sale.json`));
  const distros = JSON.parse(fs.readFileSync(`./conf/distros.json`));
  const [owner, wallet, james, miguel, edwhale] = accounts;

  describe(`Instantiation`, () => {
    it(`should instantiate with the price set to ${saleConf.price} Wei.`, () =>
      Sale.deployed()
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), saleConf.price,
        `The price was not instantiated properly.`))
    );
    it(`should instantiate with the owner set to ${saleConf.owner}.`, () =>
      Sale.deployed()
      .then((instance) => instance.owner.call())
      .then((owner) => assert.equal(owner.valueOf(), saleConf.owner,
        `The owner was not instantiated properly.`))
    );
    it(`should instantiate with the wallet set to ${saleConf.wallet}.`, () =>
      Sale.deployed()
      .then((instance) => instance.wallet.call())
      .then((wallet) => assert.equal(wallet.valueOf(), saleConf.wallet,
        `The wallet was not instantiated properly.`))
    );
    it(`should instantiate with the startBlock set to ${saleConf.startBlock}.`, () =>
      Sale.deployed()
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), saleConf.startBlock,
        `The startBlock was not instantiated properly.`))
    );
    it(`should instantiate with the token set to ${Token.address}.`, () =>
      Sale.deployed()
      .then((instance) => instance.token.call())
      .then((token) => assert.equal(token.valueOf(), Token.address,
        `The token was not instantiated properly`))
    );
    it(`should instantiate with ${distros.publicSale} million sellable tokens.`, () =>
      Token.deployed()
      .then((instance) => instance.balanceOf.call(Sale.address))
      .then((balance) => assert.equal(balance.valueOf(), distros.publicSale,
        `The sale contract was not given the correct number of tokens to sell`))
    );
  });

  describe(`Owner-only functions`, () => {
    it(`should not allow James to change the price.`, () =>
       Sale.deployed()
      .then((instance) => instance.changePrice(saleConf.price + 1, {from: james}))
      .then(() => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), saleConf.price,
        `A non-owner was able to change the sale price`))
      .catch((err) => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), saleConf.price,
        `A non-owner was able to change the sale price`))
    );
    it(`should not allow James to change the startBlock.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeStartBlock(saleConf.startBlock + 1, {from: james}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), saleConf.startBlock,
        `A non-owner was able to change the sale startBlock`))
      .catch((err) => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), saleConf.startBlock,
        `A non-owner was able to change the sale startBlock`))
    );
    it(`should not allow James to change the owner.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeOwner(james, {from: james}))
      .then(() => Sale.deployed())
      .then((instance) => instance.owner.call())
      .then((owner) => assert.equal(owner.valueOf(), saleConf.owner,
        `A non-owner was able to change the sale owner`))
      .catch((err) => Sale.deployed())
      .then((instance) => instance.owner.call())
      .then((owner) => assert.equal(owner.valueOf(), saleConf.owner,
        `A non-owner was able to change the sale owner`))
    );
    it(`should not allow James to activate the emergencyStop.`, () =>
       Sale.deployed()
      .then((instance) => instance.emergencyStop({from: james}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), saleConf.startBlock,
        `A non-owner was able to activate the emergencyStop`))
      .catch((err) => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), saleConf.startBlock,
        `A non-owner was able to activate the emergencyStop`))
    );
    it(`should change the owner to miguel.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeOwner(miguel, {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.owner.call())
      .then((owner) => assert.equal(owner.valueOf(), miguel,
        `The owner was not able to change the owner`))
    );
    it(`should change the owner back to owner.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeOwner(owner, {from: miguel}))
      .then(() => Sale.deployed())
      .then((instance) => instance.owner.call())
      .then((owner) => assert.equal(owner.valueOf(), owner,
        `The owner was not able to change the owner`))
    );
    it(`should not allow miguel to change the price.`, () =>
       Sale.deployed()
      .then((instance) => instance.changePrice(saleConf.price + 1, {from: miguel}))
      .then(() => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), saleConf.price,
        `A non-owner was able to change the sale price`))
      .catch((err) => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), saleConf.price,
        `A non-owner was able to change the sale price`))
    );
    it(`should change the price to 1.`, () =>
       Sale.deployed()
      .then((instance) => instance.changePrice(1, {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), 1,
        `The owner was not able to change the price`))
    );
    it(`should change the startBlock to 2666.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeStartBlock(2666, {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), 2666,
        `The owner was not able to change the sale startBlock`))
    );
    it(`should activate the emergencyStop.`, () =>
       Sale.deployed()
      .then((instance) => instance.emergencyStop({from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), (2**256) - 1,
        `The owner was not able to activate the emergencyStop`))
    );
    it(`should change the startBlock to ${saleConf.startBlock}.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeStartBlock(saleConf.startBlock, {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.valueOf(), saleConf.startBlock,
        `The owner was not able to change the sale startBlock`))
    );
    it(`should change the price back to ${saleConf.price}.`, () =>
       Sale.deployed()
      .then((instance) => instance.changePrice(saleConf.price, {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), saleConf.price,
        `The owner was not able to change the sale price`))
    );
  });

  describe(`Pre-sale period`, () => {
    it(`should reject a purchase from James.`, () =>
      Sale.deployed()
      .then((instance) => instance.purchaseAdToken(420,
        {from: james, value: saleConf.price * 420}))
      .catch((err) => Token.deployed())
      .then((instance) => instance.balanceOf.call(james))
      .then((balance) => assert.equal(balance.valueOf(), 0, `James was able ` +
        `to purchase tokens in the pre-sale period.`))
    );
    // owner already has 500mm tokens, need to complete distros
    it(`should allow owner to purchase 1 token`, () =>       
      Sale.deployed()
      .then((instance) => instance.purchaseAdToken(1,
        {from: owner, value: saleConf.price * 1}))
      .then(() => Token.deployed())
      .then((instance) => instance.balanceOf.call(owner))
      .then((balance) => assert.equal(balance.valueOf(), 1, `Owner was not able ` +
        `to purchase tokens in the pre-sale period.`))
      .catch((err) => { 
        throw new Error(err); 
      })
    );
  });

  describe(`Sale period 0`, () => {
    it(`should transfer 1 token to James.`);
    it(`should transfer 10 tokens to Miguel.`);
    it(`should transfer 100 tokens to Edwhale.`);
  });

  describe(`Emergency stop`, () => {
    it(`should reject purchases from James, Miguel and Edwhale.`);
  });

  describe(`Sale period 1`, () => {
    it(`should reject a transfer of ${distros.publicSale} tokens to Edwhale.`);
    it(`should transfer ${distros.publicSale - 112} tokens to Edwhale.`);
  });

  describe(`Post-sale period`, () => {
    it(`should reject purchases from James, Miguel and Edwhale.`);
    it(`should report ${distros.publicSale * saleConf.price} Wei in the wallet.`);
    it(`should report a zero balance for the sale contract.`);
    it(`should allow Edwhale to transfer 10 tokens to James.`);
  });
});
