import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import "dotenv/config";

const app = express();
app.use(cors());

const redis = new Redis(process.env.REDIS_CONNECTION_STRING);
const subRedis = new Redis(process.env.REDIS_CONNECTION_STRING);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
    }
})

subRedis.on('message', async (channel, message) => {
    io.to(channel).emit('room-update', message);
});

subRedis.on('error', (err) => {
    console.error("Error with Redis subscription", err);
});

io.on('connection', async (socket) => {
    const { id } = socket;
    
    socket.on('join-room', async (room: string) => {
        console.log(`User ${id} joined room ${room}`);
        
        const subscribedRooms = await redis.smembers("subscribed-rooms");
        await socket.join(room);
    
        await redis.sadd(`room:${room}`, id);
        await redis.hincrby("room-connections", room, 1);
    
        if (!subscribedRooms.includes(room)) {
            subRedis.subscribe(room, async (err, count) => {
                if (err) {
                    console.error("Error subscribing to room", err);
                    return;
                }else {
                    await redis.sadd("subscribed-rooms", room);
                    console.log(`Subscribed to ${room}`);
                }
            });
        }
    });

    socket.on('disconnect', async () => {
        const { id } = socket;

        const joinedRooms = await redis.smembers(`room:${id}`);
        await redis.del(`room:${id}`);

        joinedRooms.forEach(async (room) => {
            const remainingConnections = await redis.hincrby("room-connections", room, -1);
        
            if (remainingConnections <= 0) {
                await redis.hdel(`room-connections`, room);
            
                subRedis.unsubscribe(room, async (err, count) => {
                    if (err) {
                        console.error("Error unsubscribing from room", err);
                        return;
                    }else {
                        await redis.srem("subscribed-rooms", room);
                        console.log(`Unsubscribed from ${room}`);
                    }
                });
            }
        });
    });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})