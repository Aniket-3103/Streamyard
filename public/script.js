const userVideo=document.getElementById("user-video");
const startButton=document.getElementById("start");
let key=document.getElementById("key");

const state={media:null};

//instance of the socket that we've created.
const socket=io();

//Record the user's media with MediaRecorder and set audio/video bit rate. Also, set the frame rate.
//This recorded video needs to be converted to binary data.
startButton.addEventListener("click", ()=>{
    const mediaRecorder=new MediaRecorder(state.media,{
        audioBitsPerSecond:128000,
        videoBitsPerSecond:2500000,
        frameRate: 25
    });

    //Storing the user's streaming key.
    let streamKey=key.value;
    socket.emit('streamKey', streamKey);

    //Whenever media is available, send it to the node js server as a binary stream.
    mediaRecorder.ondataavailable=(ev)=>{
        socket.emit('binaryStream', ev.data);
    };

    //starting the media recorder with time slice of 25 milliseconds. This means ondataavailable event will be triggered
    //every 25 ms
    mediaRecorder.start(25);
});




//When the window is loaded, user's audio and video will be captured.
window.addEventListener("load", async function(e){
    const media=await navigator.mediaDevices.getUserMedia({audio:true, video:true});
    state.media=media;

    //showing media to the users.
    userVideo.srcObject=media;
});



