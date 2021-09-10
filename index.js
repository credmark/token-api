const serverless = require('serverless-http');
const express = require('express');

require('dotenv').config();

const app = express();

const Web3 = require("web3")

const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/" + process.env.INFURA_KEY))

const CMK_CONTRACT_ADDRESS = "0x68cfb82eacb9f198d508b514d898a403c449533e";
const cmk_json = require("./CMK.json");
const locked_addresses = require("./locked_addresses.json");

const ALLUDEL_ADDRESS = "0x004ba6820a30a2c7b6458720495fb1ec5b5f7823"
const SUSHI_CMK_ETH_ADDRESS = "0x3349217670f9aa55C5640a2b3d806654D27d0569";

const ALLUDEL_ABI = JSON.parse(require("./Alludel.json").result);
const SUSHI_CMK_ETH_ABI = JSON.parse(require("./SushiCMKETH.json").result)
const cmk_contract = new web3.eth.Contract(cmk_json.abi, CMK_CONTRACT_ADDRESS);
const alludel_contract = new web3.eth.Contract(ALLUDEL_ABI, ALLUDEL_ADDRESS);
const sushi_cmk_eth_contract = new web3.eth.Contract(SUSHI_CMK_ETH_ABI, SUSHI_CMK_ETH_ADDRESS)

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

app.get('/crucible/wizard_island_avg_apy', (req, res)=>{
    alludel_contract.methods.getAludelData().call().then(
        (aludel_data) => {
            let totalRemainingRewards = 0;
            let remainingDurations = [];
            let dt_now = Date.now() / 1000;
            aludel_data.rewardSchedules.map((rs)=>{
                if (parseFloat(rs.start) + parseFloat(rs.duration) > parseFloat(dt_now))
                {
                    totalRemainingRewards += rs.shares * (1 - ((dt_now - rs.start) / rs.duration));
                    remainingDurations.push(parseFloat(dt_now) - parseFloat(rs.start) + parseFloat(rs.duration));
                }
            });
            let avgRemainingDuration = remainingDurations.reduce((a,b) => a + b, 0) / remainingDurations.length;

            sushi_cmk_eth_contract.methods.getReserves().call().then(
                (sushi_reserves) => {
                    sushi_cmk_eth_contract.methods.totalSupply().call().then(
                        (total_supply) => {        
                            // scale the wei 
                            let rewards_remaining_value_in_cmk = totalRemainingRewards / (10**24);

                            // get the amount of cmk value in one slp token
                            let slp_value_in_cmk = sushi_reserves[0] * 2 / total_supply ;

                            // get the staked amount of slp tokens
                            let staked_amt_in_slp = aludel_data.totalStake / 10**18;

                            // calculate the multiplier to convert to APY
                            let secs_in_year = (365 * 24 * 60 * 60)
                            let time_mult = secs_in_year / avgRemainingDuration

                            // for the average taket the remaining rewards value to be extracted, divide it by the staked value in the same scale, 
                            // and multiply it by the APY to annualize it.
                            res.json ({
                                averageApy: (
                                    rewards_remaining_value_in_cmk * time_mult / (staked_amt_in_slp * slp_value_in_cmk) 
                                ),
                                stakedAmount_value_in_cmk: staked_amt_in_slp * slp_value_in_cmk,
                                rewardsRemaining_value_in_cmk: rewards_remaining_value_in_cmk,
                            });
                        }
                    )
                }
            )
        }
    )
});

app.listen(port, () =>
    console.log(`Example app listening on port ${port}!`),
);

// Use this section to run locally
// app.listen(port, () =>
//     console.log(`CMK app listening on port ${port}!`),
//);

// To run on API Gateway and Lambda
module.exports.handler = serverless(app);
