"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress, type Address } from "viem";
import { AVALANCHE_CHAIN_ID, AVALANCHE_RPC_URL, XSGD_ADDRESS, readXsgdBalance } from "@/lib/avalanche";

type WalletStatus = "idle" | "connecting" | "loading" | "connected" | "error";

function WalletIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6.5h14a2 2 0 0 1 2 2V18H6a2 2 0 0 1-2-2V6.5Z"/><path d="M4.5 7 16 3.5v3M16 12h4"/><circle cx="16" cy="12" r=".5" fill="currentColor"/></svg>;
}

function RefreshIcon({ spinning=false }:{ spinning?:boolean }) {
  return <svg className={`h-4 w-4 ${spinning?"animate-spin":""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.5 10A7 7 0 0 0 6 7.5L4 12m16 0-2 4.5A7 7 0 0 1 5.5 14"/></svg>;
}

function readableError(error:unknown) {
  const value=error as { code?:number; message?:string; shortMessage?:string };
  if(value.code===4001) return "Connection cancelled in MetaMask.";
  if(value.code===-32002) return "MetaMask already has a connection request open.";
  return value.shortMessage ?? value.message?.split("\n")[0] ?? "Unable to connect to MetaMask.";
}

function formatBalance(value:string) {
  const amount=Number(value);
  if(!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("en-SG",{minimumFractionDigits:2,maximumFractionDigits:4}).format(amount);
}

export function WalletButton() {
  const [status,setStatus]=useState<WalletStatus>("idle");
  const [address,setAddress]=useState<Address|null>(null);
  const [balance,setBalance]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [open,setOpen]=useState(false);
  const [onAvalanche,setOnAvalanche]=useState(false);
  const panelRef=useRef<HTMLDivElement>(null);

  const refreshBalance=useCallback(async(account:Address)=>{
    setStatus("loading"); setError("");
    try { setBalance(await readXsgdBalance(account)); setStatus("connected"); }
    catch(err) { setStatus("error"); setError(`Wallet connected, but XSGD could not be read: ${readableError(err)}`); }
  },[]);

  const setConnectedAccount=useCallback(async(account:string)=>{
    const checksum=getAddress(account); setAddress(checksum); await refreshBalance(checksum);
  },[refreshBalance]);

  const ensureAvalanche=useCallback(async()=>{
    const provider=window.ethereum;
    if(!provider) throw new Error("MetaMask is not installed in this browser.");
    const current=await provider.request<string>({method:"eth_chainId"});
    if(current.toLowerCase()===AVALANCHE_CHAIN_ID) { setOnAvalanche(true); return; }
    try { await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:AVALANCHE_CHAIN_ID}]}); }
    catch(err) {
      const value=err as {code?:number};
      if(value.code!==4902) throw err;
      await provider.request({method:"wallet_addEthereumChain",params:[{chainId:AVALANCHE_CHAIN_ID,chainName:"Avalanche C-Chain",nativeCurrency:{name:"Avalanche",symbol:"AVAX",decimals:18},rpcUrls:[AVALANCHE_RPC_URL],blockExplorerUrls:["https://snowtrace.io"]}]});
    }
    setOnAvalanche(true);
  },[]);

  const connect=useCallback(async()=>{
    setStatus("connecting"); setError("");
    try {
      const provider=window.ethereum;
      if(!provider) throw new Error("MetaMask is not installed. Install the extension, then reload this page.");
      const accounts=await provider.request<string[]>({method:"eth_requestAccounts"});
      if(!accounts[0]) throw new Error("MetaMask did not return an account.");
      await ensureAvalanche(); await setConnectedAccount(accounts[0]); setOpen(true);
    } catch(err) { setStatus("error"); setError(readableError(err)); }
  },[ensureAvalanche,setConnectedAccount]);

  const switchNetwork=useCallback(async()=>{
    setError("");
    try { await ensureAvalanche(); }
    catch(err) { setError(readableError(err)); }
  },[ensureAvalanche]);

  useEffect(()=>{
    const provider=window.ethereum; if(!provider) return;
    provider.request<string[]>({method:"eth_accounts"}).then(accounts=>{ if(accounts[0]) setConnectedAccount(accounts[0]); }).catch(()=>undefined);
    provider.request<string>({method:"eth_chainId"}).then(chain=>setOnAvalanche(chain.toLowerCase()===AVALANCHE_CHAIN_ID)).catch(()=>undefined);
    const accountsChanged=(value:unknown)=>{ const accounts=value as string[]; if(accounts[0]) setConnectedAccount(accounts[0]); else {setAddress(null);setBalance(null);setStatus("idle");setOpen(false);} };
    const chainChanged=(value:unknown)=>{ setOnAvalanche(String(value).toLowerCase()===AVALANCHE_CHAIN_ID); if(address) refreshBalance(address); };
    provider.on("accountsChanged",accountsChanged); provider.on("chainChanged",chainChanged);
    return()=>{provider.removeListener("accountsChanged",accountsChanged);provider.removeListener("chainChanged",chainChanged);};
  },[address,refreshBalance,setConnectedAccount]);

  useEffect(()=>{
    function outside(event:MouseEvent){ if(panelRef.current&&!panelRef.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown",outside); return()=>document.removeEventListener("mousedown",outside);
  },[]);

  const shortAddress=useMemo(()=>address?`${address.slice(0,6)}…${address.slice(-4)}`:"",[address]);
  const busy=status==="connecting"||status==="loading";

  return <div className="relative" ref={panelRef}>
    <button onClick={address?()=>setOpen(value=>!value):connect} disabled={busy} aria-expanded={address?open:undefined} className="focus-ring flex h-11 min-w-[128px] items-center justify-center gap-2 rounded-full bg-[#17241d] px-4 text-sm font-extrabold text-white transition hover:bg-[#1f5638] disabled:cursor-wait disabled:opacity-70">
      <WalletIcon/>{busy?(status==="connecting"?"Connecting…":"Reading XSGD…"):address?<><span className="hidden sm:inline">{formatBalance(balance??"0")} XSGD</span><span className="sm:hidden">{shortAddress}</span></>:"Connect wallet"}
    </button>
    {error&&!address&&<div role="alert" className="absolute right-0 top-14 z-40 w-72 rounded-xl border border-red-200 bg-white p-3 text-xs font-semibold leading-5 text-red-700 shadow-xl">{error}{error.includes("not installed")&&<a className="mt-2 block font-extrabold underline" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get MetaMask</a>}</div>}
    {open&&address&&<div className="lift-in absolute right-0 top-14 z-40 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-[#dfe4df] bg-white p-5 shadow-[0_20px_60px_rgba(23,36,29,.16)]">
      <div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#67716b]">Connected wallet</p><span className={`flex items-center gap-1.5 text-[11px] font-bold ${onAvalanche?"text-[#1f5638]":"text-amber-700"}`}><span className={`h-2 w-2 rounded-full ${onAvalanche?"bg-[#4e9b69]":"bg-amber-500"}`}/>{onAvalanche?"Avalanche":"Wrong network"}</span></div>
      <a href={`https://snowtrace.io/address/${address}`} target="_blank" rel="noreferrer" className="focus-ring mt-2 block rounded text-sm font-extrabold hover:underline" title={address}>{shortAddress}</a>
      <div className="mt-4 rounded-xl bg-[#f2f8c8] p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#52605a]">Available balance</p><button onClick={()=>refreshBalance(address)} disabled={busy} className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-[#1f5638] hover:bg-white/60 disabled:opacity-50" aria-label="Refresh XSGD balance"><RefreshIcon spinning={busy}/></button></div><p className="mt-1 text-2xl font-extrabold tabular-nums text-[#123e28]">{balance===null?"—":formatBalance(balance)} <span className="text-sm">XSGD</span></p></div>
      {!onAvalanche&&<button onClick={switchNetwork} className="focus-ring mt-3 h-11 w-full rounded-full border border-amber-300 bg-amber-50 text-xs font-extrabold text-amber-800 hover:bg-amber-100">Switch to Avalanche</button>}
      {error&&<p role="alert" className="mt-3 text-xs font-semibold leading-5 text-red-700">{error}</p>}
      <p className="mt-4 break-all text-[10px] leading-4 text-[#89918c]">Token: {XSGD_ADDRESS}</p>
    </div>}
  </div>;
}
