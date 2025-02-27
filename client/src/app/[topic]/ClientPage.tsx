"use client"

import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { use, useEffect, useState } from "react";
import { Wordcloud } from "@visx/wordcloud";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitComment } from "../actions";
import { useMutation } from "@tanstack/react-query";
import { io } from "socket.io-client";

const socket = io("http://localhost:8080");

interface ClientPageProps {
    topicName: string;
    initialData: {text: string; value: number}[];
}

const COLORS = ["#FF006E", "#00B0FF", "#FFD300", "#FF00B8", "#00FF6A", "#FF6E00", "#00FFD1", "#FFB800", "#6E00FF", "#D300FF"];

const ClientPage = ({topicName, initialData}: ClientPageProps) => {
    const [words, setWords] = useState<{text: string; value: number}[]>(initialData);
    const [input, setInput] = useState<string>("");

    useEffect(() => {
        socket.emit("join-room", `room:${topicName}`);
    }, []);

    useEffect(() => {
    socket.on("room-update", (message: string) => {
      const data = JSON.parse(message) as {
        text: string
        value: number
      }[]

      data.map((newWord) => {
        const isWordAlreadyIncluded = words.some(
          (word) => word.text === newWord.text
        )

        if (isWordAlreadyIncluded) {
          // increment
          setWords((prev) => {
            const before = prev.find((word) => word.text === newWord.text)
            const rest = prev.filter((word) => word.text !== newWord.text)

            return [
              ...rest,
              { text: before!.text, value: before!.value + newWord.value },
            ]
          })
        } else if (words.length < 50) {
          // add to state
          setWords((prev) => [...prev, newWord])
        }
      })
    })

    return () => {
      socket.off("room-update")
    }
  }, [words]);


    const fontScale = scaleLog({
        domain: [
            Math.min(...words.map((word) => word.value)), 
            Math.max(...words.map((word) => word.value))
        ],
        range: [10, 100],
    });

    const { mutate, isPending } = useMutation({
        mutationFn: submitComment,
    });

    return (
        <div className="w-full flex flex-col items-center justify-center min-h-screen bg-grid-zinc-50 pb-20">
            <MaxWidthWrapper className="flex flex-col items-center gap-6 pt-20">
                <h1 className="text-4xl sm:text-5xl font-bold text-center tracking-tight text-balance">
                    What people think about{" "}
                    <span className="text-blue-600">{topicName}</span>:
                </h1>

                <p className="text-sm">(updated in real-time)</p>

                <div className="aspect-square max-w-xl flex items-center justify-center">
                    <Wordcloud 
                        words={words} 
                        width={500} 
                        height={500} 
                        fontSize={(data) => fontScale(data.value)}
                        font={"Impact"}
                        padding={2}
                        spiral={"archimedean"}
                        rotate={0}
                        random={() => 0.5}
                    >
                        {(cloudWords) => cloudWords.map((w, i) => (
                            <Text 
                                key={w.text} 
                                fill={COLORS[i % COLORS.length]}
                                textAnchor="middle"
                                transform={`translate(${w.x}, ${w.y})`}
                                fontSize={w.size}
                                fontFamily={w.font}
                            >
                                {w.text}
                            </Text>
                        ))}
                    </Wordcloud>
                </div>

                <div className="max-w-lg w-full">
                    <Label>
                        Here's what I think about {topicName}
                    </Label>
                    <div className="mt-1 flex gap-2 items-center">
                        <Input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`${topicName} is absolutely...`}/>
                        <Button
                            disabled={isPending}
                            onClick={() => mutate({ comment: input, topicName })}
                            >
                            Share
                        </Button>
                    </div>
                </div>
            </MaxWidthWrapper>
        </div>
    )
}

export default ClientPage