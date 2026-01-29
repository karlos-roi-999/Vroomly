import ChatsBar from '../components/ChatsPageComponents/ChatsBar';
import Navbar from '../components/HomeComponents/Navbar';
import ChatContainer from '../components/ChatsPageComponents/ChatContainer';
import { io } from 'socket.io-client'

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log(`Connected to: ${socket.id}` );
})

const ChatsPage = () => {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Navbar pageLocation={ChatsPage.name}/>
        <div style={{display:'flex', flex: 1, height: '100%', minHeight: 0}}>
            <ChatsBar/>
            <ChatContainer chatId={2}/>
        </div>
    </div>
  );
};

export default ChatsPage;
