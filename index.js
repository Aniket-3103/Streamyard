import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import express from 'express';
import path from 'path';
import { Server as SocketIO } from 'socket.io';
import { spawn } from 'child_process';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);


let key = "";
let ffmpegProcess;


function updateFfmpegOptions() {
    const options = [
        '-i',
        '-',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-r', `${25}`,
        '-g', `${25 * 2}`,
        '-keyint_min', 25,
        '-crf', '25',
        '-pix_fmt', 'yuv420p',
        '-sc_threshold', '0',
        '-profile:v', 'main',
        '-level', '3.1',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', 128000 / 4,
        '-f', 'flv',
        `rtmp://a.rtmp.youtube.com/live2/${key}`, // Including streaming key in the stream URL
    ];

    // Kill the existing ffmpeg process if it's already running
    if (ffmpegProcess) {
        ffmpegProcess.kill();
    }

    // Spawn new ffmpeg process with updated options
    ffmpegProcess = spawn('ffmpeg', options);

    ffmpegProcess.stdout.on('data', (data) => {
        console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`ffmpeg process exited with code ${code}`);
    });
};


app.use(express.static(path.resolve("./public")));


//Whenever there is a connection and binary stream is incoming, we need to throw it on RTMP server.
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    //receives streaming key from the client.
    socket.on('streamKey', (streamKey) => {
        console.log(`Received streamKey: ${streamKey}`);
        key = streamKey;

        //updating the ffmpeg instance with user's stream key
        updateFfmpegOptions();
    });


    socket.on("binaryStream", (stream) => {
        console.log("binary stream incoming");
        if (ffmpegProcess) {
            ffmpegProcess.stdin.write(stream, (err) => {
                if (err) {
                    console.log("Bhai nahi chal raha dekh to sahi ye kya keh raha hai:", err);
                }
            });
        } else {
            console.log("ffmpegProcess is not initialized yet.");
        }
    });
});


const port=process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server is running of port 8080`);
});
