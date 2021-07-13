import React from 'react';
import * as Mui from '@material-ui/core';
import * as MuiIcons from '@material-ui/icons';


const WithdrawForm = (props) => {
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };
  
    const handleSubmit = () => {
      props.withdrawFromRegistry();
      setOpen(false);
    }

    const getBalance = () => {
      if (props.appState.offerRegistryBalance) {
        const balanceInWei = props.web3.utils.toBN(props.appState.offerRegistryBalance);
        return props.web3.utils.fromWei(balanceInWei, "ether");
      } else {
        return "<error>"
      }
    }

    return (
      <div>
        <Mui.Button variant="contained" color="primary" onClick={handleClickOpen} >
          Withdraw
        </Mui.Button>

        <Mui.Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
          <Mui.DialogTitle id="form-dialog-title">Withdraw (from contract <strong><tt>{props.appState.registryAddress}</tt></strong>)</Mui.DialogTitle>
          <Mui.DialogContent>
            <Mui.DialogContentText>
              Are you sure you want to withdraw? Your contract has <strong>{getBalance()} ETH</strong> balance.
            </Mui.DialogContentText>

          </Mui.DialogContent>
          <Mui.DialogActions>
            <Mui.Button onClick={handleClose} color="primary">
              Cancel
            </Mui.Button>
            <Mui.Button onClick={handleSubmit} variant="contained" color="primary" disabled={getBalance() == 0}>
              Withdraw
            </Mui.Button>
          </Mui.DialogActions>
        </Mui.Dialog>
      </div>
    );
  }

export default WithdrawForm;