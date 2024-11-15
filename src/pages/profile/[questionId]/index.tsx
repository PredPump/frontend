import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { TOKEN_CONTRACT } from "../../../contracts";
import { Abi } from "viem";
import fpmmAbi from "../../../contracts/fpmm/fpmmAbi.json";
import { handleCheckCanResolve } from "../../../hooks/useCheckCanResolve";
import { handleReport } from "../../../hooks/UseReport";

interface Event {
  id: number;
  fpmm_title: string;
  fpmm_address: string;
  deployer: string;
  created_at: string;
}

const Index = () => {
  const router = useRouter();
  const { questionId } = router.query;
  const [eventData, setEventData] = useState<Event | null>(null);
  const [funding, setFunding] = useState<string>("");
  const [canResolve, setCanResolve] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const { address } = useAccount(); // Add this to check if user is the deployer

  const {
    data: hashApprove,
    isPending: isPendingApprove,
    writeContract: writeContractApprove,
  } = useWriteContract();
  const { isLoading: isConfirmingApprove, isSuccess: isConfirmedApproved } =
    useWaitForTransactionReceipt({
      hash: hashApprove,
    });
  function handleApprove() {
    // Convert input amount to 18 decimal places
    const amount = BigInt(parseFloat(funding) * 10 ** 18);
    writeContractApprove({
      address: TOKEN_CONTRACT.address,
      abi: TOKEN_CONTRACT.abi as Abi,
      functionName: "approve",
      args: [eventData!.fpmm_address, amount],
    });
  }

  const {
    data: hash,
    isPending: isPending,
    writeContract: writeContract,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  function handleFunding() {
    // Convert input amount to 18 decimal places
    const amount = BigInt(parseFloat(funding) * 10 ** 18);
    writeContract({
      address: eventData!.fpmm_address as `0x${string}`,
      abi: fpmmAbi as Abi,
      functionName: "addFunding",
      args: [amount, [1, 1]],
    });
  }

  async function fetchEventData() {
    if (!questionId) return;

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("questionId", questionId)
        .single();

      if (error) throw error;
      if (data) setEventData(data);
    } catch (error) {
      console.error("Error fetching event:", error);
    }
  }

  async function checkCanResolve() {
    if (!eventData || !questionId) return;
    
    try {
      const canResolveStatus = await handleCheckCanResolve(
        eventData.fpmm_address,
        eventData.deployer,
        questionId as string,
        2
      );
      setCanResolve(canResolveStatus);
      console.log("Can resolve:", canResolveStatus);
    } catch (error) {
      console.error("Error checking resolution status:", error);
      setCanResolve(false);
    }
  }

  const handleResolveEvent = async (resultIndex: number) => {
    if (!eventData || !canResolve) return;

    try {
      setIsResolving(true);
      await handleReport(
        eventData.fpmm_address,
        questionId as string,
        resultIndex
      );

      // Update the database
      const { error } = await supabase
        .from("events")
        .update({ 
          resolved: true,
          resolution: resultIndex === 1 ? "Yes" : "No"
        })
        .eq("questionId", questionId);

      if (error) throw error;

      // Refetch event data
      await fetchEventData();
    } catch (error) {
      console.error("Error resolving event:", error);
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [questionId]);

  useEffect(() => {
    if (eventData) {
      checkCanResolve();
    }
  }, [eventData]);

  return (
    <div>
      <h1>EVENTS</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        {eventData && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Resolution Status: {canResolve ? 'Ready to Resolve' : 'Not Ready'}
              </p>
              {!canResolve && (
                <button 
                  onClick={checkCanResolve}
                  className="text-blue-500 underline"
                >
                  Check Again
                </button>
              )}
            </div>

            <h2 className="text-xl font-semibold mb-4">Resolve Event</h2>
            <div className="space-y-4">
              {address === eventData.deployer ? (
                <>
                  <p className="text-gray-600">
                    As the event creator, you can resolve this event with the final outcome.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleResolveEvent(1)}
                      disabled={!canResolve || isResolving}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                    >
                      {isResolving ? "Resolving..." : "Resolve as YES"}
                    </button>
                    <button
                      onClick={() => handleResolveEvent(0)}
                      disabled={!canResolve || isResolving}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                    >
                      {isResolving ? "Resolving..." : "Resolve as NO"}
                    </button>
                  </div>
                  {!canResolve && (
                    <p className="text-yellow-600">
                      Cannot resolve yet. Please check if the resolution conditions are met.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-600">
                  Only the event creator can resolve this event.
                </p>
              )}
            </div>
          </>
        )}
      </div>
      {eventData && (
        <div>
          <h2>Event Details:</h2>
          <div>Title: {eventData.fpmm_title}</div>
          <div>FPMM Address: {eventData.fpmm_address}</div>
          <div>Deployer: {eventData.deployer}</div>
          <div>
            Created: {new Date(eventData.created_at).toLocaleDateString()}
          </div>
          <h1>QuestionId: {questionId}</h1>

          <div>
            <h2>Add Funding</h2>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                className="border p-2 rounded"
              />
              <button
                onClick={handleApprove}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                {isPendingApprove ? "Confirming..." : "Approve"}
              </button>
              {isConfirmingApprove && <div>Waiting for confirmation...</div>}
              {isConfirmedApproved && <div>Transaction confirmed.</div>}

              <button
                onClick={handleFunding}
                className=" bg-yellow-400 text-white px-4 py-2 rounded"
              >
                {isPending ? "Confirming..." : "Add Funding"}
              </button>
              {isConfirming && <div>Waiting for confirmation...</div>}
              {isConfirmed && <div>Transaction confirmed.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
