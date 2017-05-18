/*global web3 describe before artifacts assert it contract:true*/
const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);
const BN = require(`bn.js`);
const HttpProvider = require(`ethjs-provider-http`);
const EthRPC = require('ethjs-rpc');
const EthQuery = require('ethjs-query');
const ethRPC = new EthRPC(new HttpProvider('http://localhost:8545'));
const ethQuery = new EthQuery(new HttpProvider('http://localhost:8545'));

contract(`Sale`, (accounts) => {
  const saleConf = JSON.parse(fs.readFileSync(`./conf/sale.json`));
  const distros = JSON.parse(fs.readFileSync(`./conf/distros.json`));
  const [owner, wallet, james, miguel, edwhale] = accounts;

  function purchaseAdToken(actor, amount) {
    if(!BN.isBN(amount)) { throw new Error(`Supplied amount is not a BN.`); }
    return Sale.deployed()
    .then((instance) => instance.purchaseAdToken(amount,
      {from: actor, value: amount.mul(saleConf.price)}))
  }

  function getBalanceOf(actor) {
    return Token.deployed()
    .then((instance) => instance.balanceOf.call(actor))
    .then((balance) =>  { return new BN(balance.valueOf(), 10); })
  }

  before(() => {
    for(recipient in distros) {
      distros[recipient].amount = new BN(distros[recipient].amount, 10);
    }
    saleConf.price = new BN(saleConf.price, 10);
    saleConf.startBlock = new BN(saleConf.startBlock, 10);
  });

  describe(`Initial token issuance`, () => {
    for(recipient in distros) {
      it(`should instantiate ${recipient} with ${distros[recipient].amount} tokens.`, () =>
        Token.deployed()
        .then((instance) => instance.balanceOf.call(distros[recipient].address))
        .then((balance) => assert.equal(balance.valueOf(), distros[recipient].amount))
      );
    }
    // Sanity check
    it(`should instantiate the public sale with ${distros.publicSale.amount} tokens. ` +
      `(This is a sanity check.).`, () =>
      Token.deployed()
      .then((instance) => instance.balanceOf.call(Sale.address))
      .then((balance) => assert.equal(balance.valueOf(), distros.publicSale.amount,
        `The sale contract was not given the correct number of tokens to sell`))
    );
  });
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
      .then((instance) => instance.changePrice(new BN(`1`, 10), {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.price.call())
      .then((price) => assert.equal(price.valueOf(), `1`,
        `The owner was not able to change the price`))
    );
    it(`should change the startBlock to 2666.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeStartBlock(new BN(`2666`, 10), {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.toString(10), `2666`,
        `The owner was not able to change the sale startBlock`))
    );
    it(`should activate the emergencyStop.`, () =>
       Sale.deployed()
      .then((instance) => instance.emergencyStop({from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(new BN(startBlock.toString(10), 10).toString(10),
        new BN(`2`, 10).pow(new BN(`256`, 10)).sub(new BN(`1`, 10)).toString(10),
        `The owner was not able to activate the emergencyStop`))
    );
    it(`should change the startBlock to ${saleConf.startBlock}.`, () =>
       Sale.deployed()
      .then((instance) => instance.changeStartBlock(saleConf.startBlock, {from: owner}))
      .then(() => Sale.deployed())
      .then((instance) => instance.startBlock.call())
      .then((startBlock) => assert.equal(startBlock.toString(10), saleConf.startBlock,
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
      purchaseAdToken(james, new BN(`420`, 10))
      .then(() => { throw new Error(`James was able to purchase tokens when he ` +
        `should not have been able to.`); })
      .catch((err) => getBalanceOf(james))
      .then((balance) => assert.equal(balance.toString(10), `0`, `James was able ` +
        `to purchase tokens in the pre-sale period.`))
    );
    it(`should allow owner to purchase 1 token`, () =>       
      purchaseAdToken(owner, new BN(`1`, 10))
      .then(() => getBalanceOf(owner))
      .then((balance) => assert.equal(balance.toString(10), `1`, `Owner was not able ` +
        `to purchase tokens in the pre-sale period.`))
      .catch((err) => { 
        throw new Error(err); 
      })
    );
  });

  describe(`Sale period 0`, () => {
    before(() => {
      function forceMine(blockToMine) {
        if(!BN.isBN(blockToMine)) {
          throw new Error(`Supplied block number must be a BN.`);
        }
        return new Promise((resolve, reject) =>
          ethQuery.blockNumber()
          .then((blockNumber) => {
            if(new BN(blockNumber, 10).lt(blockToMine)) {
              ethRPC.sendAsync({method: `evm_mine`}, (err) => {
                if(err !== undefined && err !== null) { reject(err); }
                resolve(forceMine(blockToMine));
              });
            } else {
              resolve();
            }
          })
        )
      }

      return forceMine(new BN(saleConf.startBlock, 10));
    });

    it(`should transfer 1 token to James.`, () => {
      purchaseAdToken(james, new BN(`1`, 10))
      .then(() => getBalanceOf(james))
      .then((balance) => assert.equal(balance.toString(10), `1`, `James was not able ` +
        `to purchase tokens in the sale period.`))
      .catch((err) => { throw new Error(err); })
    });
    it(`should transfer 10 tokens to Miguel.`, () =>
      purchaseAdToken(miguel, new BN(`10`, 10))
      .then(() => getBalanceOf(miguel))
      .then((balance) => assert.equal(balance.toString(10), `10`, `Miguel was not able ` +
        `to purchase tokens in the sale period.`))
      .catch((err) => { throw new Error(err); })
    );
    it(`should transfer 100 tokens to Edwhale.`, () =>
      purchaseAdToken(edwhale, new BN(`100`, 10))
      .then(() => getBalanceOf(edwhale))
      .then((balance) => assert.equal(balance.toString(10), `100`, `Edwhale was not able ` +
        `to purchase tokens in the sale period.`))
      .catch((err) => { throw new Error(err); })
    );
  });

  describe(`Emergency stop`, () => {
    before(() =>
      Sale.deployed()
      .then((instance) => instance.emergencyStop({from: owner}))
      .catch((err) => { throw new Error(err); })
    );
    it(`should not transfer 1 token to James.`, () =>
      purchaseAdToken(james, new BN(`1`, 10))
      .then(() => { throw new Error(`James was able ` +
        `to purchase tokens in the emergency stop period.`); })
      .catch((err) => getBalanceOf(james))
      .then((balance) => assert.equal(balance.toString(10), `1`, `James was able ` +
        `to purchase tokens in the emergency stop period.`))
    );
    it(`should not transfer 10 tokens to Miguel.`, () =>
      purchaseAdToken(miguel, new BN(`10`, 10))
      .then(() => { throw new Error(`Miguel was able ` +
        `to purchase tokens in the emergency stop period.`); })
      .catch((err) => getBalanceOf(miguel))
      .then((balance) => assert.equal(balance.toString(10), `10`, `Miguel was able ` +
        `to purchase tokens in the emergency stop period.`))
    );
    it(`should not transfer 100 tokens to Edwhale.`, () =>
      purchaseAdToken(edwhale, new BN(`100`, 10))
      .then(() => { throw new Error(`Edwhale was able ` +
        `to purchase tokens in the emergency stop period.`); })
      .catch((err) => getBalanceOf(edwhale))
      .then((balance) => assert.equal(balance.toString(10), `100`, `Edwhale was able ` +
        `to purchase tokens in the emergency stop period.`))
    );
    after(() =>
      Sale.deployed()
      .then((instance) => instance.changeStartBlock(saleConf.startBlock, {from: owner}))
      .catch((err) => { throw new Error(err); })
    );
  });

  describe(`Sale period 1`, () => {
    it(`should reject a transfer of ${distros.publicSale.amount} tokens to Edwhale.`, () =>
      purchaseAdToken(edwhale, distros.publicSale.amount)
      .then(() => { throw new Error(`Edwhale was able ` +
        `to purchase more tokens than should be available.`); })
      .catch((err) => getBalanceOf(edwhale))
      .then((balance) => assert.equal(balance.toString(10), `100`, `Edwhale was able ` +
        `to purchase more tokens than should be available.`))
    );
    it(`should transfer all the remaining tokens to Edwhale.`, () => {
      let saleBalance;
      return getBalanceOf(Sale.address)
      .then((balance) => {
        saleBalance = new BN(balance.toString(10), 10);
        return purchaseAdToken(edwhale, saleBalance);
      })
      .then(() => getBalanceOf(edwhale))
      .then((balance) => assert.equal(balance.toString(10),
        saleBalance.add(new BN(`100`, 10)).toString(10),
        `Edwhale was able to purchase more tokens than should be available.`))
      .catch((err) => { throw new Error(err); })
    });

  });

  describe(`Post-sale period`, () => {
    it(`should not transfer 1 token to James.`, () =>
      purchaseAdToken(james, new BN(`1`, 10))
      .then(() => { throw new Error(`James was able ` +
        `to purchase tokens after the sale ended.`); })
      .catch((err) => getBalanceOf(james))
      .then((balance) => assert.equal(balance.toString(10), 1, `James was able ` +
        `to purchase tokens after the sale ended.`))
    );
    it(`should not transfer 10 tokens to Miguel.`, () =>
      purchaseAdToken(miguel, new BN(`10`, 10))
      .then(() => { throw new Error(`Miguel was able ` +
        `to purchase tokens after the sale ended.`); })
      .catch((err) => getBalanceOf(miguel))
      .then((balance) => assert.equal(balance.toString(10), `10`, `Miguel was able ` +
        `to purchase tokens after the sale ended.`))
    );
    it(`should not transfer 100 tokens to Edwhale.`, () =>
      purchaseAdToken(edwhale, new BN(`100`, 10))
      .then(() => { throw new Error(`Edwhale was able ` +
        `to purchase tokens after the sale ended.`); })
      .catch((err) => getBalanceOf(edwhale))
      .then((balance) => assert.equal(balance.toString(10),
        new BN(distros.publicSale.amount, 10).sub(new BN(`12`, 10)).toString(10),
        `Edwhale was able to purchase tokens after the sale ended.`))
    );
    it(`should report ${distros.publicSale.amount * saleConf.price} Wei in the wallet.`);
    it(`should report a zero balance for the sale contract.`);
    it(`should allow Edwhale to transfer 10 tokens to James.`);
  });
});
