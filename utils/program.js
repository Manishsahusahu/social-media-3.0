import { AnchorProvider, BN, Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./constants";

export const getProgram = (connection, wallet) => {
  // we have grabbed the program deployed at program_id address on solana and idl is also taken from beta.solpg.io where we deployed program(smart contract)
  const IDL = require("./idl.json");
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  const program = new Program(IDL, PROGRAM_ID, provider);
  return program;
};

export const getUserAccountPk = async (owner) => {
  return (
    await PublicKey.findProgramAddress(
      [Buffer.from("user"), owner.toBuffer()],
      PROGRAM_ID // this will return the public key by taking seeds
    )
  )[0];
};

export const getPostAccountPk = async (owner, id) => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from("post"), // for string
        owner.toBuffer(), // for public key
        new BN(id).toArrayLike(Buffer, "le", 8), // for u64 number
      ],
      PROGRAM_ID
    )
  )[0];
};

export const getLikeAccountPk = async (owner, id, liker) => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from("like"),
        owner.toBuffer(),
        new BN(id).toArrayLike(Buffer, "le", 8), // bn: big number, solana can't read direct id number so need to pass like this
        liker.toBuffer(),
      ],
      PROGRAM_ID
    )
  )[0];
};
