import React from 'react';
import * as Mui from '@material-ui/core';
import * as MuiIcons from '@material-ui/icons';

const SimpleCard = (props) => {
    const [open, setOpen] = React.useState(false);
    const handleClickOpen = () => {
      props.getAllSubscribers(props.avatarText);
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };

    return (
      <Mui.Card >
        <Mui.CardHeader
          avatar={
            <Mui.Avatar aria-label="recipe">
              {props.avatarText}
            </Mui.Avatar>
          }

          title={<strong>{props.titleText}</strong>}
          titleTypographyProps={{variant: 'subtitle1' }}
          subheader={<i>{props.subheaderText}</i>}
        />

        <Mui.CardContent>
          <Mui.Typography variant="subtitle2" gutterBottom>
            {props.mainText}
          </Mui.Typography>

          <Mui.Typography color="textSecondary" variant="subtitle2">
            <div><pre>{props.secondaryText}</pre></div>

          </Mui.Typography>
        </Mui.CardContent>
        <Mui.CardActions>
          <Mui.Button size="small" color="primary" onClick={handleClickOpen}>
            <strong>Details</strong>
          </Mui.Button>

          <Mui.Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
          <Mui.DialogTitle id="form-dialog-title"><strong>{props.titleText}</strong></Mui.DialogTitle>
          <Mui.DialogContent>
            <Mui.DialogContentText>
            Active subscribers:
            {!props.appState.selectedOfferSubscribers.length && ' none.'}
            <Mui.List dense>
            {props.appState.selectedOfferSubscribers.map((subscriber, index) => 
              
                <Mui.ListItem>
                  <Mui.ListItemIcon>
                    <MuiIcons.TimelapseSharp />
                  </Mui.ListItemIcon>
          
                  <Mui.ListItemText
                    primary={<strong><tt>{subscriber.newSubscriptionOwner}</tt></strong>}
                    secondary={'Valid until ' + (new Date(subscriber.expirationTime*1000)).toLocaleString()}
                  />

                  <Mui.Box m={2}>                   
                    <Mui.Button xs size="small" color="secondary" variant="contained" onClick={() => props.stopSubscription(subscriber.newSubscriptionOwner, props.avatarText)}>
                      Halt
                    </Mui.Button>
                  </Mui.Box>
                </Mui.ListItem>
              )
            }
            </Mui.List>
            Update Offer Properties:
            <props.inlineTextFieldButton
              handleInputChange={props.handleInputChange}
              name="updatedOfferBaseFee"
              value={props.appState.updatedOfferBaseFee}
              label="Offer Base Fee"
              action={() => props.updateBaseFee(props.avatarText, props.appState.updatedOfferBaseFee)}
            />
            <props.inlineTextFieldButton
              handleInputChange={props.handleInputChange}
              name="updatedOfferMinimumTime"
              value={props.appState.updatedOfferMinimumTime}
              label="Offer Minimum Time"
              action={() => props.updateMinimumTime(props.avatarText, props.appState.updatedOfferMinimumTime)}
            />
            </Mui.DialogContentText>

          </Mui.DialogContent>
          <Mui.DialogActions>
            <Mui.Button onClick={handleClose} color="primary">
              Cancel
            </Mui.Button>
            <Mui.Button
              onClick={() => { props.retireOffer(props.avatarText); handleClose() } }
              variant="contained"
              color="secondary"
            >
              Retire
            </Mui.Button>
          </Mui.DialogActions>
        </Mui.Dialog>
        </Mui.CardActions>
      </Mui.Card>
    );
  }


export default SimpleCard;