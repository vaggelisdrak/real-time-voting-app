"use client"

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useMutation } from "@tanstack/react-query";
import { createTopic } from "@/app/actions";

const TopicCreator = () => {

    const [input, setInput] = useState<string>("");

    const {mutate, error ,isPending} = useMutation({
        mutationFn: createTopic,
    })

    console.log(error)

    return  (
    <div className="mt-12 flex flex-col gap-2">
        <div className="flex gap-2">
            <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
                className="bg-white min-w-64"
                placeholder="Enter topic here..."
            />
            <Button disabled={isPending} onClick={() => mutate({ topicName: input })}>Create</Button>
        </div>
    </div>
)}

export default TopicCreator;