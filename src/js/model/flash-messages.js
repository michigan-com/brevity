import React from 'react';

class FlashMessages extends React.Component {
  state = {
    messages: []
  };

  constructor(props) {
    super(props);
  }

  addMessage = (msg) => {
    let messages = this.state.messages;
    messages.push(msg);

    this.setState({ messages });
  };

  removeMessage(index) {
    let messages = [];
    for (var i = 0; i < this.state.messages.length; i++) {
      if (i === index) continue;
      messages.push(this.state.messages[i]);
    }

    this.setState({ messages });
  }

  renderMessage = (msg, index) => {
    return (
      <div className='message' key={ `flash-message-${index}` }>
        <div className='content'>
          { msg }
        </div>
        <div className='remove-message'>
          <i onClick={ this.removeMessage.bind(this, index) } className='fa fa-times'></i>
        </div>
      </div>
    );
  };

  render() {
    return (
      <div className='messages'>
        { this.state.messages.map(this.renderMessage) }
      </div>
    );
  };
}

var flash = React.render(
  <FlashMessages/>,
  document.getElementById('messages')
)

module.exports = {
  addMessage: flash.addMessage
};
