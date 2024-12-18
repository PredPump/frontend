import { CHAINS_CONFIG } from "../../constants/chains";
import { TOKEN_CONTRACT } from "../../contracts";
import { useEffect, useState } from "react";

export const useGetTokenContract = (chainId: number) => {
  const [contractAddress, setContractAddress] = useState<`0x${string}`>(
    "0x0000000000000000000000000000000000000000" as `0x${string}`
  );

  useEffect(() => {
    const chainConfig = CHAINS_CONFIG[chainId as keyof typeof CHAINS_CONFIG];

    if (chainConfig) {
      setContractAddress(
        chainConfig.contractAddress.token_address as `0x${string}`
      );
    } else {
      setContractAddress(
        "0x0000000000000000000000000000000000000000" as `0x${string}`
      );
    }
  }, [chainId]);

  return {
    address: contractAddress,
    abi: TOKEN_CONTRACT.abi,
  } as const;
};
