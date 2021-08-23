const serverless = require('serverless-http');
const express = require('express');

require('dotenv').config();

const app = express();

const Web3 = require("web3")

const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/" + process.env.INFURA_KEY))

const CMK_CONTRACT_ADDRESS = "0x68cfb82eacb9f198d508b514d898a403c449533e";
const cmk_json = require("./CMK.json");
const locked_addresses = require("./locked_addresses.json");

const cmk_contract = new web3.eth.Contract(cmk_json.abi, CMK_CONTRACT_ADDRESS);

var port = process.env.PORT || 8080;

app.get('/cmk/circulating_supply_raw', (req, res) => {

    cmk_contract.methods.totalSupply().call().then((supply) => {
        Promise.all(
            locked_addresses.map((la) => {
                return cmk_contract.methods.balanceOf(la).call();
            })).then((values) => {
                
            let circulating_supply = web3.utils.fromWei(supply);
            for (v of values) {
                circulating_supply = circulating_supply - web3.utils.fromWei(v)
            }
            return res.send('' + circulating_supply);
        });


    });
});

// Use this section to run locally
// app.listen(port, () =>
//     console.log(`CMK app listening on port ${port}!`),
//);

// To run on API Gateway and Lambda
module.exports.handler = serverless(app);
