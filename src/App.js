import React, { Component } from "react";

import '@fontsource/roboto';

import ScopedCssBaseline from '@material-ui/core/ScopedCssBaseline';

import * as Mui from '@material-ui/core';
import * as MuiIcons from '@material-ui/icons';

import Web3 from "web3";

import EntityRegistry from "./contracts/EntityRegistry.json";
import EntityOfferRegistry from "./contracts/EntityOfferRegistry.json";

import SimpleCard from "./SimpleCard"

import WithdrawForm from "./WithdrawForm"
import NewOfferForm from "./NewOfferForm"
class App extends Component {
  state = { accounts: null,
            isLoaded: false,
            currentBalance: 'unavailable',
            registryAddress: null,
            offerRegistryBalance: null,
            showAccountNotification: false,
            showEntityRegistryNotification: false,
            newOfferRegistryNotification: null,
            newOfferNotification: null,
            newOfferName: null,
            allOffersDetails: [],
            selectedOfferSubscribers: [],
            updatedOfferBaseFee: 0,
            updatedOfferMinimumTime: 0
          };

  componentDidMount = async () => {
    // TODO: incremental check for each step (isLoaded = logical AND over all steps)
    window.App = this;

    this.web3 = await this.getWeb3Metamask();
    this.entityRegistryInstance = await this.getContractInstance(EntityRegistry);
    await this.updateAccounts();
    await this.getEntityRegistryAddress();
    this.handleMetaMaskAccountChange();

    this.setState({ isLoaded: true });

    console.log(this.state);
  };

  getWeb3Metamask = () => new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    window.addEventListener("load", async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Request account access if needed
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          // Acccounts now exposed
          resolve(web3);
        } catch (error) {
          reject(error);
        }
      } else {
        console.log("No web3 instance injected, using Local web3.");
        reject();
      }
    })
    }
  )

  getContractInstance = async (contractJSON, customAdress = null) => {
    const localWeb3 = this.web3;
    try {
      if (customAdress) {
        return new localWeb3.eth.Contract(contractJSON.abi, customAdress);
      }

      const networkId = await localWeb3.eth.net.getId();
      const deployedNetwork = contractJSON.networks[networkId];

      return new localWeb3.eth.Contract(contractJSON.abi, deployedNetwork && deployedNetwork.address);
    } catch (err) {
      console.error(err);
    }
  }

  updateAccounts = async () => {
    try {
      this.setState({ isLoaded: false });
      let accounts = await this.web3.eth.getAccounts();
      this.setState({ accounts });
      await this.updateAccountBalance();
    
      this.setState({ isLoaded: true, showAccountNotification: true });


      console.log("Loaded account: ", this.state.accounts[0]);
    } catch (error) {
      alert(
        `Failed to load accounts. Check console for details.`,
      );
      console.error(error);
    }
  }

  updateAccountBalance = async () => {
    let currentBalance =  this.web3.utils.fromWei(await this.web3.eth.getBalance(this.state.accounts[0]), "ether");
    this.setState({ currentBalance });
  }

  handleMetaMaskAccountChange = () => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async () => {
        await this.updateAccounts();
        await this.getEntityRegistryAddress();
        this.setState({ showEntityRegistryNotification: Boolean(this.state.registryAddress) });
      });
    }
  }

  getEntityRegistryAddress = async () => {
    this.setState({ registryAddress: null });
    let registryAddress = await this.entityRegistryInstance.methods.entityRegistries(this.state.accounts[0]).call();
    // check that returned address is not zero
    if (this.web3.utils.hexToNumberString(registryAddress) !== this.web3.utils.hexToNumberString("0x0")) {
      this.setState({ registryAddress });
      this.setState({ offerRegistryBalance: registryAddress ? await this.web3.eth.getBalance(registryAddress) : "0" })
      await this.getAllOffers();
    } else {
      this.setState({ registryAddress: null });
    }
  }

  getAllOffers = async () => {
    if (! Boolean(this.state.registryAddress)) {
      this.setState({ allOffersDetails: [] });
      return;
    }
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);

    const offerCount = await offerRegistryInstance.methods.offerCount().call();

    let offersListBuilder = [];
    for (let i=0; i < offerCount; i++) {
      const offer = await offerRegistryInstance.methods.entityOffers(i).call();

      offersListBuilder.push({
        offerName: offer.offerName,
        baseFee: offer.baseFee,
        minimumSubscriptionTime: offer.minimumSubscriptionTime,
        isRetired: offer.isRetired
      });
    }
    this.setState({ allOffersDetails: offersListBuilder });
  }

  isSubscriptionActive = async (subscriptionOwner, offerIndex) => {
    let offerContractInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    let returnValue = await offerContractInstance.methods.isSubscriptionActive(subscriptionOwner, offerIndex).call({ from: this.state.accounts[0], gasLimit: 8000000 });
    return returnValue;
  }

  getAllSubscribersForOffer = async (selectedOfferIndex) => {
    this.setState({ 
      updatedOfferBaseFee: 0,
      updatedOfferMinimumTime: 0
    });
    this.setState({ selectedOfferSubscribers: []});

    let currentTime = new Date().getTime();
    var isTimeInFuture = (unixTime, currentTime) => {
      let compareTime = new Date(unixTime * 1000);
      let diff = compareTime - currentTime;
      return diff > 0;
    }

    let offerRegistryInstanceWebSocket = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);

    const allEvents = await offerRegistryInstanceWebSocket.getPastEvents("SubscriptionAdded",
                            { 
                              fromBlock: 0,
                              filter: { offerIndex: selectedOfferIndex.toString() }
                            });
    console.log(allEvents);

    var subscriberList = [];
    allEvents.forEach(async (event) => {
      let rv = event.returnValues;

      if (isTimeInFuture(rv.expirationTimestamp, currentTime)) {
        let realExpirationTimestamp = await offerRegistryInstanceWebSocket.methods.subscribers(rv.newSubscriptionOwner, rv.offerIndex).call();
        let newSubscriber = {
          offerIndex: rv.offerIndex,
          duration: rv.duration,
          expirationTime: realExpirationTimestamp,
          newSubscriptionOwner: rv.newSubscriptionOwner
        };

        var subscribersJoined = this.state.selectedOfferSubscribers.concat(newSubscriber)
        this.setState({ selectedOfferSubscribers: subscribersJoined});
      }
    });

    this.setState({ 
      updatedOfferBaseFee: this.state.allOffersDetails[selectedOfferIndex].baseFee,
      updatedOfferMinimumTime: this.state.allOffersDetails[selectedOfferIndex].minimumSubscriptionTime
    });
  }

  createOfferRegistry = async () => {
    try {
      let emitter = this.entityRegistryInstance.events.EntityAdded({ filter: { entityOwner: this.state.accounts[0] } })
        .on("data", async (evt) => {
          this.setState({ newOfferRegistryNotification: evt.transactionHash })
          this.setState({ registryAddress: evt.returnValues.newEntityOfferRegistry });
        });
      
      await this.entityRegistryInstance.methods.addEntity().send({ from: this.state.accounts[0], gasLimit: 8000000 });
      // TODO: update account balance after transaction
      // await this.updateAccountBalance();
      // TODO: remove event listener after succesful transaction
      // emitter.removeAllListeners("data");
      await this.getAllOffers();
    } catch(error) {
      console.error(error);
    }
  }

  createNewOffer = async () => {    
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    try {
      let emitter = offerRegistryInstance.events.OfferAdded({ filter: { offerOwner: this.state.accounts[0] } })
        .on("data", async (evt) => {
          // evt.returnValues = {offerOwner, offerIndex}
          this.setState({ newOfferNotification: evt.transactionHash })

          console.log(evt);


          let offersListBuilder = this.state.allOffersDetails;
          const offer = await offerRegistryInstance.methods.entityOffers(evt.returnValues.offerIndex).call();

          offersListBuilder.push({
            offerName: offer.offerName,
            baseFee: offer.baseFee,
            minimumSubscriptionTime: offer.minimumSubscriptionTime,
            isRetired: offer.isRetired
          });
        
          this.setState({ allOffersDetails: offersListBuilder });
        });
      
      await offerRegistryInstance.methods.addOfferWithDefaults(this.state.newOfferName).send({ from: this.state.accounts[0], gasPrice: 20000000000, gas: 8000000 });
      // TODO: update account balance after transaction
      // await this.updateAccountBalance();
      // TODO: remove event listener after succesful transaction
      emitter.removeAllListeners("data");
    } catch(error) {
      console.error(error);
    }
  }


  withdrawFromRegistry = async () => {    
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    try {
      let emitter = offerRegistryInstance.events.Withdrawal({ filter: { offerOwner: this.state.accounts[0] } })
        .on("data", async (evt) => {
          // evt.returnValues = {offerOwner, amount}

          console.log(evt);
        });
      
      await offerRegistryInstance.methods.withdraw().send({ from: this.state.accounts[0], gasLimit: 8000000 });
      // TODO: update account balance after transaction
      // await this.updateAccountBalance();
      // TODO: remove event listener after succesful transaction
      emitter.removeAllListeners("data");
    } catch(error) {
      console.error(error);
    }
  }

  updateBaseFee = async (offerIndex, newBaseFee) => {
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    try {
      await offerRegistryInstance.methods.setBaseFee(offerIndex, newBaseFee).send({ from: this.state.accounts[0], gasLimit: 8000000 });
    } catch (err) {
      console.log(err);
    }
  }

  updateMinimumTime = async (offerIndex, newMinimum) => {
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    try {
      await offerRegistryInstance.methods.setMinimumSubscriptionTime(offerIndex, newMinimum).send({ from: this.state.accounts[0], gasLimit: 8000000 });
    } catch (err) {
      console.log(err);
    }
  }

  retireOffer = async (offerIndex) => {
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    try {
      await offerRegistryInstance.methods.retireOffer(offerIndex).send({ from: this.state.accounts[0], gasLimit: 8000000 });
    } catch (err) {
      console.log(err);
    }
  }

  stopSubscription = async (subscriptionOwner, offerIndex) => {
    let offerRegistryInstance = await this.getContractInstance(EntityOfferRegistry, this.state.registryAddress);
    try {
      await offerRegistryInstance.methods.stopSubscription(subscriptionOwner, offerIndex).send({ from: this.state.accounts[0], gasLimit: 8000000 });
    } catch (err) {
      console.log(err);
    }
  }


  
  renderOfferRegistry() {
    if (Boolean(this.state.registryAddress)) {
      return (
        <div>
        
        <Mui.Box p={3}>
            {(!Array.isArray(this.state.allOffersDetails) || !this.state.allOffersDetails.length) && <Mui.Typography>You have no offers yet.</Mui.Typography>}
            {this.state.allOffersDetails.length > 0 && <Mui.Typography><br/>Here are your current subscription offers:</Mui.Typography>}
            <br/>
            <Mui.Grid
                container
                spacing={2}
                direction="row"
                justify="flex-start"
                alignItems="flex-start"
            >
              {this.state.allOffersDetails.map((offerDetails, offerIndex) => 
                <Mui.Grid item xs={12} sm={6} md={3}>
                  <SimpleCard
                  titleText={offerDetails.offerName} 
                  subheaderText="subscription offer"
                  avatarText={offerIndex}
                  mainText="Offer properties:"
                  secondaryText={JSON.stringify(offerDetails, null, 2)}
                  appState={this.state}
                  getAllSubscribers={this.getAllSubscribersForOffer}
                  updateBaseFee={this.updateBaseFee}
                  updateMinimumTime={this.updateMinimumTime}
                  retireOffer={this.retireOffer}
                  stopSubscription={this.stopSubscription}
                  inlineTextFieldButton={this.InlineTextFieldButton}
                  
                  handleInputChange={this.handleInputChange}
                  />
                </Mui.Grid>
              )}
            </Mui.Grid>
        </Mui.Box>

        
        <Mui.Box p={3} bgcolor="background.paper"> 
          <NewOfferForm createNewOffer={this.createNewOffer} handleInputChange={this.handleInputChange}/>
        </Mui.Box>

        <Mui.Box p={3} bgcolor="background.paper"> 
          <WithdrawForm withdrawFromRegistry={this.withdrawFromRegistry} web3={this.web3} appState={this.state}/>
        </Mui.Box>
        </div>
      );
    } else {
      return (
        <div style={{textAlign: 'center'}}>
        <Mui.Box p={3} bgcolor="background.paper"> 
          <Mui.Typography variant="h6">
          Hi. It looks like there is no offer registry for your account yet. Would you like to create one?
          </Mui.Typography>
        </Mui.Box> 
          <Mui.Button variant="contained" color="primary" onClick={this.createOfferRegistry}>Create Offer Registry</Mui.Button>

        </div>
      );
    }
  }

  AccountSnackbar(props) {    
    return (
      <div>
        <Mui.Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          open={props.appState.showAccountNotification}
          autoHideDuration={6000}
          onClose={props.closeFunction}
          message={"Loaded account " + props.appState.accounts[0] + "."}
          action={
            <React.Fragment>
              <Mui.IconButton size="small" aria-label="close" color="inherit" onClick={props.closeFunction}>
                <MuiIcons.Close fontSize="small" />
              </Mui.IconButton>
            </React.Fragment>
          }
        />
      </div>
    );
  }

  EntityRegistrySnackbar(props) {    
    return (
      <div>
        <Mui.Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          open={props.appState.showEntityRegistryNotification}
          autoHideDuration={6000}
          onClose={props.closeFunction}
          message={"Loaded offer registry @ " + props.appState.registryAddress + "."}
          action={
            <React.Fragment>
              <Mui.IconButton size="small" aria-label="close" color="inherit" onClick={props.closeFunction}>
                <MuiIcons.Close fontSize="small" />
              </Mui.IconButton>
            </React.Fragment>
          }
        />
      </div>
    );
  }

  OfferRegistryTransactionSnackbar(props) {    
    return (
      <div>
        <Mui.Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          open={props.appState.newOfferRegistryNotification !== null}
          autoHideDuration={10000}
          onClose={props.closeFunction}
          message={"Created new offer registry (TX: " + props.appState.newOfferRegistryNotification + ")."}
          action={
            <React.Fragment>
              <Mui.IconButton size="small" aria-label="close" color="inherit" onClick={props.closeFunction}>
                <MuiIcons.Close fontSize="small" />
              </Mui.IconButton>
            </React.Fragment>
          }
        />
      </div>
    );
  }

  NewOfferTransactionSnackbar(props) {    
    return (
      <div>
        <Mui.Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          open={props.appState.newOfferNotification !== null}
          autoHideDuration={10000}
          onClose={props.closeFunction}
          message={"Created new offer (TX: " + props.appState.newOfferNotification + ")."}
          action={
            <React.Fragment>
              <Mui.IconButton size="small" aria-label="close" color="inherit" onClick={props.closeFunction}>
                <MuiIcons.Close fontSize="small" />
              </Mui.IconButton>
            </React.Fragment>
          }
        />
      </div>
    );
  }

  

  InlineTextFieldButton(props) {
    return (
      <Mui.Box p={1}>
        <Mui.Grid container>
          <Mui.Grid item>
            <Mui.TextField
                type="number"
                name={props.name}
                value={props.value}
                label={props.label}
                onChange={props.handleInputChange}
              />
          </Mui.Grid>
          <Mui.Grid item alignItems="stretch" style={{ display: "flex" }}>
            <Mui.Button variant="contained" color="primary" onClick={props.action}>
                Update
            </Mui.Button>
          </Mui.Grid>
        </Mui.Grid>
      </Mui.Box>
    );
  }

  

 

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    console.log("state change ", name, value);
    this.setState({
      [name]: value
    });
  }

  render() {
    if (!this.state.isLoaded) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <ScopedCssBaseline>
      <div className="App"> 
        <this.AccountSnackbar appState={this.state}
          closeFunction={(event, reason) => { if (reason === 'clickaway') return;
                                              this.setState({showAccountNotification: false });}}
        />

        <this.EntityRegistrySnackbar appState={this.state}
          closeFunction={(event, reason) => { if (reason === 'clickaway') return;
                                              this.setState({ showEntityRegistryNotification: false });}}
        />

        <this.OfferRegistryTransactionSnackbar appState={this.state}
          closeFunction={(event, reason) => { if (reason === 'clickaway') return;
                                              this.setState({ newOfferRegistryNotification: null });}}
        />

        <this.NewOfferTransactionSnackbar appState={this.state}
          closeFunction={(event, reason) => { if (reason === 'clickaway') return;
                                              this.setState({ newOfferNotification: null });}}
        />

        <div>
          <Mui.AppBar position="static">
              <Mui.Toolbar>        
                  <Mui.Box display='flex' flexGrow={2} >
                  Using account&nbsp;<strong>{this.state.accounts[0]}</strong>&nbsp;({this.state.currentBalance} ETH)
                  </Mui.Box>

                  <Mui.Typography>
                  <strong>SUBSCRIPTION MANAGER</strong> <i>(business entity view)</i>
                  </Mui.Typography >
              </Mui.Toolbar>
          </Mui.AppBar>
        </div>
          {this.renderOfferRegistry()}
        <div>

        </div>
        
      </div>
      </ScopedCssBaseline>
    );
  }
}

export default App;
