import React from 'react';
import * as Mui from '@material-ui/core';
import * as MuiIcons from '@material-ui/icons';

const NewOfferForm = (props) => {
    const [open, setOpen] = React.useState(false);
  
    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };
  
    const handleSubmit = () => {
      props.createNewOffer();
      setOpen(false);
    }

    return (
      <div>
        <Mui.Button variant="contained" color="primary" onClick={handleClickOpen}>
          Add New Offer
        </Mui.Button>

        <Mui.Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
          <Mui.DialogTitle id="form-dialog-title">Add New Offer</Mui.DialogTitle>
          <Mui.DialogContent>
            <Mui.DialogContentText>
              Enter the offer details.
            </Mui.DialogContentText>
            <Mui.TextField
              autoComplete="off"
              autoFocus
              required
              margin="dense"
              id="required"
              name="newOfferName"
              label="Offer Name"
              fullWidth
              inputProps={{ maxLength: 32, style: {textTransform: 'uppercase'}}}
              onChange={props.handleInputChange}
            />
          </Mui.DialogContent>
          <Mui.DialogActions>
            <Mui.Button onClick={handleClose} color="primary">
              Cancel
            </Mui.Button>
            <Mui.Button onClick={handleSubmit} variant="contained" color="primary">
              Create Offer
            </Mui.Button>
          </Mui.DialogActions>
        </Mui.Dialog>
      </div>
    );
  }

export default NewOfferForm;