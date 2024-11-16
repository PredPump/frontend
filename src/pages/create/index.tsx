"use client";
import TextField from "@mui/material/TextField";
import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { FACTORY_CONTRACT, TOKEN_CONTRACT } from "../../contracts";
import { Abi, keccak256 } from "viem";
import { encodeAbiParameters } from "viem";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import confetti from "canvas-confetti";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function index() {
  const [question, setQuestion] = useState("");
  const encodedQuestion = encodeAbiParameters([{ type: "string" }], [question]);
  const questionId = keccak256(encodedQuestion);
  const [fpmmAddress, setFpmmAddress] = useState<string>("");
  const [isStoringData, setIsStoringData] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Flag to track if the component has mounted
  const { address } = useAccount();
  const { data: hash, isPending, writeContract } = useWriteContract();

  const router = useRouter();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isConfirmed) {
      // Trigger confetti on success
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      console.log("Transaction confirmed!");
    }
  }, [isConfirmed]);

  useEffect(() => {
    // Set the initial date once the component is mounted
    setSelectedDate(dayjs(new Date()));
  }, []);

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(
    dayjs().add(10, "day")
  );
  console.log(dayjs().add(10, "day"));

  function handleDeployPrediction() {
    if (selectedDate) {
      const epochSeconds = selectedDate.unix();
      writeContract({
        address: FACTORY_CONTRACT.address,
        abi: FACTORY_CONTRACT.abi as Abi,
        functionName: "createFPMM",
        args: [
          TOKEN_CONTRACT.address as `0x${string}`, // collateralToken - address
          address as `0x${string}`, // oracle - address
          questionId as `0x${string}`, // questionId - bytes32
          BigInt(2), // outcomeSlotCount - uint256
          BigInt(epochSeconds), // endTime - uint256
          BigInt(2), // fee - uint256
        ],
      });
    }
  }

  async function storeEventData(fpmmAddress: string, question: string) {
    try {
      setIsStoringData(true);
      const { data, error } = await supabase.from("events").insert([
        {
          fpmm_address: fpmmAddress,
          fpmm_title: question,
          deployer: address,
          questionId: questionId,
        },
      ]);

      if (error) throw error;
      console.log("Stored event data successfully");
    } catch (error) {
      console.error("Error storing event data:", error);
    } finally {
      setIsStoringData(false);
    }
  }

  useEffect(() => {
    if (receipt?.logs[1]?.topics[2]) {
      const fpmmAddressWithPadding = receipt.logs[1].topics[2];
      const cleanAddress = `0x${fpmmAddressWithPadding.slice(26)}`;
      setFpmmAddress(cleanAddress);
      console.log("clean Address", cleanAddress);

      storeEventData(cleanAddress, question);
    }
  }, [receipt]);

  // function confirmMarket() {
  //   const marketChoices =
  //   choices.length < 2 ? [`${question}Choice`] : [...choices];
  //   console.log([question, ...marketChoices]);
  //   return [question, ...marketChoices];
  // }

  // const [choices, setChoices] = useState([""]);
  // function addChoice() {
  //   if (choices.length >= 2) {
  //     alert("Only 2 choices max at the moment");
  //     return;
  //   }
  //   setChoices([...choices, ""]);
  // }

  useEffect(() => {
    setIsMounted(true); // Set the flag to true when the component mounts
  }, []);

  // Only render the component on the client side
  if (!isMounted) {
    return null; // Prevent rendering on the server-side
  }

  return (
    <div className="flex flex-col justify-center items-center  min-h-[50vh]">
      <div className="flex flex-col justify-center items-center bg-white w-[500px] rounded-md p-5">
        <div className="press-start-2p-regular">Create a Prediction Market</div>
        <div> Predict the future, earn more, rule the markets!</div>
        <div className="text-teal-300 my-2 bg-slate-50 w-full">
          <TextField
            id="outlined-controlled"
            focused
            variant="filled"
            label="Title: "
            value={question}
            color="success"
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
            fullWidth
          />
        </div>

        <div className="flex flex-col items-center space-y-4 pb-5">
          <label className="text-gray-700 font-medium">
            Select Date and Time:
          </label>
          <DateTimePicker
            label="End Date"
            value={selectedDate}
            onChange={(value) => setSelectedDate(value)}
          />
        </div>

        <button
          className="bg-teal-300 text-black hover:bg-teal-700 hover:text-white p-2 rounded-lg"
          onClick={handleDeployPrediction}
          disabled={
            isPending || isStoringData || !selectedDate || question.length < 1
          }
        >
          {isPending
            ? "Confirming..."
            : isStoringData
            ? "Storing data..."
            : "Create Prediction Market"}
        </button>

        {isConfirming && hash && (
          <div>
            <div>Waiting for confirmation...</div>
            <Link
              href={`https://arbitrum-sepolia.blockscout.com/tx/${hash}`}
              target="_blank"
              className="underline"
            >
              View tx Hash: {hash.slice(0, 5)}
            </Link>
          </div>
        )}
        {isConfirmed && <div>Transaction confirmed.</div>}
        {/* {choices.length > 1 &&
          choices.map((choice, index) => {
            return (
              <div className="text-teal-300 my-2" key={index} >
                choice {index + 1} {""}
                <input
                  type="text"
                  value={choices[index]} // Set the current value
                  onChange={(e) => {
                    const updatedChoices = [...choices]; // Create a copy of the array
                    updatedChoices[index] = e.target.value; // Update the specific index
                    setChoices(updatedChoices); // Set the new state
                  }}
                />
              </div>
            );
          })}
        <button onClick={() => addChoice()} className="bg-blue-400 my-4">
          Use 2 Choice
        </button> */}
      </div>

      {isConfirmed && selectedDate && (
        <div className="flex justify-center items-center flex-col">
          <div
            className="flex flex-col justify-center items-center bg-white w-[500px] rounded-md p-5 mt-10"
            onClick={() => router.push(`/profile/${fpmmAddress}`)}
          >
            <div className="press-start-2p-regular">
              Prediction Market created
            </div>

            <div className="items-center justify-center">
              <div className="bg-white/10 p-3 rounded-lg">{question}</div>
              <div>End Date :{selectedDate.format("MMMM D, YYYY h:mm A")}</div>
            </div>

            <Button
              onClick={() => router.push(`/profile/${fpmmAddress}`)}
              className=""
            >
              Proceed to approve
            </Button>
          </div>

          <Link
            href={`https://arbitrum-sepolia.blockscout.com/address/${fpmmAddress}`}
            target="_blank"
            className="underline text-white"
          >
            View Contract on Explorer
          </Link>
        </div>
      )}
    </div>
  );
}
