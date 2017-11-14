const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

// first read in the secrets.json to get our mnemonic
let secrets;
let mnemonic;
if (fs.existsSync('secrets.json')) {
  secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
  ({ mnemonic } = secrets);
} else {
  console.log('no secrets.json found. You can only deploy to the testrpc.');
  mnemonic = '';
}

module.exports = {
  networks: {
    kovan: {
      provider: new HDWalletProvider(mnemonic, 'https://kovan.infura.io'),
      network_id: '*',
      gas: 4500000,
      gasPrice: 25000000000,
    },
    rinkeby: {
      provider: new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io'),
      network_id: '*',
      gas: 4500000,
      gasPrice: 25000000000,
    },
    mainnet: {
      provider: new HDWalletProvider(mnemonic, 'https://mainnet.infura.io'),
      network_id: 1,
      gas: 4500000,
      gasPrice: 4000000000,
    },
  },
};
