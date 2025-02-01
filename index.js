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

//stores socket.id, ffmpeg and write binary streams to process that is created with respective socket id's
const streams = {}; 

app.use(express.static(path.resolve("./public")));

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    let ffmpegProcess = null;

    socket.on('streamKey', (streamKey) => {
        console.log(`Received streamKey from ${socket.id}: ${streamKey}`);

        if (ffmpegProcess) {
            ffmpegProcess.kill(); // Kill previous process if exists for the same user
        }

        const options = [
            '-i', '-',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-r', '25',
            '-g', '50',
            '-keyint_min', '25',
            '-crf', '25',
            '-pix_fmt', 'yuv420p',
            '-sc_threshold', '0',
            '-profile:v', 'main',
            '-level', '3.1',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '32000',
            '-f', 'flv',
            `rtmp://a.rtmp.youtube.com/live2/${streamKey}`,
        ];

        ffmpegProcess = spawn('ffmpeg', options);

        //adding respective user's ffmpegProcess to streams
        streams[socket.id] = ffmpegProcess;

        ffmpegProcess.stderr.on('data', (data) => {
            console.error(`ffmpeg stderr (${socket.id}): ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`ffmpeg process for ${socket.id} exited with code ${code}`);
            delete streams[socket.id]; // Remove from active streams
        });

        ffmpegProcess.on('error', (err) => {
            console.error(`ffmpeg error for ${socket.id}:`, err);
        });
    });

    socket.on("binaryStream", (stream) => {
        if (streams[socket.id]) {
            try {
                streams[socket.id].stdin.write(stream);
            } catch (err) {
                console.error(`Error writing to ffmpeg (${socket.id}):`, err);
            }
        } else {
            console.log(`No ffmpeg process found for ${socket.id}`);
        }
    });


    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);

        if (streams[socket.id]) {
            streams[socket.id].kill(); // Stop user's ffmpeg process
            delete streams[socket.id];
        }
    });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
