const { parse } = require('dotenv');
var express    = require('express');      
var app        = express();   
require('dotenv').config();
const Web3 = require("web3")

const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/"+ process.env.INFURA_KEY))
const weinum = 10**18;
const CMK_CONTRACT_ADDRESS = "0x68cfb82eacb9f198d508b514d898a403c449533e";
const cmk_json = require("./CMK.json");
const locked_addresses = require("./locked_addresses.json");

const cmk_contract = new web3.eth.Contract(cmk_json.abi, CMK_CONTRACT_ADDRESS);

var port = process.env.PORT || 8080;    

app.get('/cmk/token_informatics/circulating_supply_raw', (req, res) => {
    
    cmk_contract.methods.totalSupply().call().then((supply)=>{
        Promise.all(
            locked_addresses.map((la)=>{
                return cmk_contract.methods.balanceOf(la).call();
            })
        ).then((values) => {
            let circulating_supply = web3.utils.fromWei(supply);
            for (v of values) {
                circulating_supply = circulating_supply - web3.utils.fromWei(v)
            }
            return res.send(''+circulating_supply);
          });
        

    });
  });

app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`),
);