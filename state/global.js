import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createContext, useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getLikeAccountPk,
  getPostAccountPk,
  getProgram,
  getUserAccountPk,
} from "../utils";

export const GlobalContext = createContext({
  isConnected: null,
  wallet: null,
  hasUserAccount: null,
  posts: null,
  fetchPosts: null,
  createUser: null,
  createPost: null,
  updatePost: null,
  deletePost: null,
  likePost: null,
  dislikePost: null,
});

export const GlobalState = ({ children }) => {
  const [program, setProgram] = useState();
  const [isConnected, setIsConnected] = useState();
  const [userAccount, setUserAccount] = useState();
  const [posts, setPosts] = useState();

  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  useEffect(() => {
    if (connection) setProgram(getProgram(connection, wallet ?? {}));
    else setProgram(null);
  }, [connection, wallet]);

  // check wallet connection
  useEffect(() => {
    setIsConnected(!!wallet?.publicKey);
  }, [wallet]); // dependancy module tells to useEffect that if this module changes then you have to run, and it runs on first loading also.

  // check for user account by fetching the user
  const fetchUserAccount = useCallback(async () => {
    if (!program) return;
    try {
      const userAccountPk = await getUserAccountPk(wallet?.publicKey);
      console.log(userAccountPk);
      const userAccount = await program.account.user.fetch(userAccountPk);
      console.log("User found!");
      setUserAccount(userAccount);
    } catch (e) {
      setUserAccount(null);
      console.log("No user account ", e);
    }
  });

  // check for user account
  useEffect(() => {
    fetchUserAccount();
  }, [isConnected]);

  const fetchPosts = useCallback(async () => {
    if (!program) return;
    const posts = await program.account.post.all();
    console.log(posts);
    setPosts(Array.from(posts).map((post) => post.account));
  }, [program]);

  useEffect(() => {
    if (!posts) fetchPosts();
  }, [posts, fetchPosts]);

  // program events
  useEffect(() => {
    if (!program) return;

    // new post  Event
    const newPostEventListener = program.addEventListener(
      "NewPostEvent",
      async (postEvent) => {
        try {
          const postAccountPk = await getPostAccountPk(
            postEvent.owner,
            postEvent.id
          );
          const newPost = await program.account.post.fetch(postAccountPk);
          setPosts((posts) => [newPost, ...posts]);
        } catch (err) {
          console.log("could'nt fetch new post account ", postEvent, err);
        }
      }
    );

    // delete post event
    const deletePostEventListener = program.addEventListener(
      "DeletePostEvent",
      (deleteEvent) => {
        setPosts((posts) => {
          posts.filter(
            (post) =>
              !(
                post.owner.equals(deleteEvent.owner) &&
                post.id.eq(deleteEvent.id)
              )
          );
        });
      }
    );
    return () => {
      program.removeEventListener(newPostEventListener); // once program is reset then clean up the side effect of adding posts into posts array, otherwise same posts will be keep adding in posts array at every re-render.
      program.removeEventListener(deletePostEventListener);
    };
  }, [program]);

  // create user
  const createUser = useCallback(async () => {
    if (!program) return;
    try {
      const txHash = await program.methods
        .createUser()
        .accounts({
          user: await getUserAccountPk(wallet.publicKey),
          owner: wallet.publicKey,
        })
        .rpc();
      await connection.confirmTransaction(txHash);
      toast.success("created user");
      fetchUserAccount();
    } catch (e) {
      console.log("Could'nt create user", e.message);
      toast.error("Creating user failed");
    }
  });

  // create post
  const createPost = useCallback(async (title, image) => {
    if (!userAccount) return;
    try {
      const postId = userAccount.lastPostId.addn(1);
      const txHash = await program.methods
        .createPost(title, image, postId)
        .accounts({
          // below data is seeds provided here to get post address, user address
          post: await getPostAccountPk(wallet.publicKey, postId.toNumber()),
          user: await getUserAccountPk(wallet.publicKey),
          owner: wallet.publicKey,
        })
        .rpc();
      await connection.confirmTransaction(txHash);
      toast.success("post created!");

      // update userAccount
      fetchUserAccount();
    } catch (e) {
      toast.error("Creating post failed");
      console.log(e.message);
    }
  });

  //delete post

  const deletePost = useCallback(async (owner, id) => {
    if (!userAccount) return;
    try {
      const txHash = await program.methods
        .deletePost()
        .accounts({
          post: await getPostAccountPk(owner, id),
          owner,
        })
        .rpc();
      toast.success("delete post succesfull!");
    } catch (error) {
      console.log("failed to delete the post! ", error.message);
    }
  });

  return (
    <GlobalContext.Provider
      value={{
        hasUserAccount: userAccount ? true : false,
        isConnected,
        createUser,
        createPost,
        deletePost,
        posts,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
