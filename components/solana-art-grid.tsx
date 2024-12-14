'use client'

const USE_API = false;

import React, { useEffect, useRef, useState } from 'react'
import { renderedPNGsBlobUrls, preRenderAllHashes } from './artDesign2'
import { LoadingAnimation } from './LoadingAnimation'
import type { RenderProgress } from './artDesign2'
import InfiniteGrid from './InfiniteGrid'
import { X, Search } from 'lucide-react'

type HoverData = {
  hash: string;
  row: number;
  col: number;
  seed: string;
} | null;

function generateSolanaHashes(n: number): { hash: string }[] {
  const hashes = [];
  for (let i = 0; i < n; i++) {
    const hash = {
      hash: Array(4).fill(0)
        .map(() => Math.random().toString(36).substring(2))
        .join('')
    };
    hashes.push(hash);
  }
  return hashes;
}

const test_hashes = generateSolanaHashes(100);

export default function SolanaArtGrid() {
  const [hoverData, setHoverData] = useState<HoverData>(null)
  const [selectedData, setSelectedData] = useState<HoverData>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [opacity, setOpacity] = useState(0)
  const popupRef = useRef<HTMLDivElement>(null)
  const [popupHeight, setPopupHeight] = useState(0)
  const [renderProgress, setRenderProgress] = useState<RenderProgress | undefined>()
  const [hashes, setHashes] = useState<string[]>([])
  const [transactions, setTransactions] = useState<{
    signature: string;
    from: string;
    amount: string;
    slot: number;
    blockTime: number;
    activity_type: string;
  }[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const updatePopupHeight = () => {
    if (popupRef.current) {
      setPopupHeight(popupRef.current.offsetHeight)
    }
  }

  useEffect(() => {
    setInterval(() => {
      updatePopupHeight();
    }, 1000)
  }, [])
  // console.log(popupHeight);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      if (USE_API) {
        const response = await fetch('/api/transactions')
        const data = await response.json()
        console.log(data)

        const hashList = data.map((tx: any) => tx.signature);
        setHashes(hashList)
        setTransactions(data)
        console.log("Hash list", hashList)

        preRenderAllHashes(hashList, 400, (progress) => {
          setRenderProgress(progress)
          if (progress.completed === progress.total) {
            setIsLoading(false)
            setTimeout(() => {
              setOpacity(1)
            }, 800)
          }
        })
      } else {
        preRenderAllHashes(test_hashes.map(tx => tx.hash), 400, (progress) => {
          setRenderProgress(progress)
          if (progress.completed === progress.total) {
            setIsLoading(false)
            setHashes(test_hashes.map(tx => tx.hash))
            setTransactions(test_hashes.map(hash => {
              return {
                signature: hash.hash,
                from: '0x123',
                amount: '100',
                slot: 123,
                blockTime: 123,
                activity_type: 'mint'
              }
            }))
            setTimeout(() => {
              setOpacity(1)
            }, 800)
          }
        })
       
      }
      updatePopupHeight();
    }

    fetchTransactions()
  }, [])

  useEffect(() => {

    updatePopupHeight()
    window.addEventListener('resize', updatePopupHeight)
    return () => window.removeEventListener('resize', updatePopupHeight)
  }, [])


  const handleCellClick = (selectedData: HoverData) => {
    console.log("selectedData", selectedData)
    setSelectedData(prevSelectedData =>
      prevSelectedData?.hash === selectedData?.hash ? null : selectedData
    )
  }

  const handleSearch = async () => {
    try {
      setIsSearching(true)
      setSearchError('')

      // lookup hash data
      const response = await fetch('/api/lookup', {
        method: 'POST',
        body: JSON.stringify({ hash: searchQuery })
      })
      const data = await response.json()

      if (!response.ok) {
        setSearchError('Invalid transaction hash')
        return
      }

      console.log(data)

      // Add hash to hashes array
      if (!hashes.includes(data.signature)) {
        setHashes([...hashes, data.signature])
      }

      // render
      preRenderAllHashes([data.signature], 400, (progress) => {
        if (progress.completed === progress.total) {
          setSelectedData({
            hash: data.signature,
            row: 0,
            col: 0,
            seed: data.signature
          })
          setIsSearchOpen(false)
          setSearchQuery('')
        }
      })
    } catch (error) {
      console.error('Search failed:', error)
      setSearchError('Invalid transaction hash')
    } finally {
      setIsSearching(false)
    }
  }

  if (isLoading) {
    return <LoadingAnimation progress={renderProgress} />
  }

  return (
    <>
      <div className="fixed inset-0">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="fixed top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black transition-colors z-20"
        >
          <Search className="w-5 h-5 text-white" />
        </button>

        {/* Search Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-black/90 border border-white/10 rounded-xl w-full max-w-lg p-6 relative">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>

              <h2 className="text-lg font-medium text-white/90 mb-4">Enter Transaction Hash</h2>

              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter transaction hash..."
                    className={`w-full px-3 py-2 bg-white/5 border ${searchError ? 'border-red-500/50' : 'border-white/10'} rounded-lg text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 ${searchError ? 'focus:ring-red-500/20' : 'focus:ring-white/20'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSearching) {
                        handleSearch()
                      }
                    }}
                  />
                  {isSearching && (
                    <div className="absolute right-3 -top-2 h-full flex items-center bg-black">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    </div>
                  )}
                  {searchError && (
                    <p className="text-red-400 text-xs mt-2">{searchError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <InfiniteGrid
          hashes={hashes}
          size={200}
          scale={1}
          opacity={opacity}
          selectedCell={selectedData}
          onCellHover={setHoverData}
          onCellClick={handleCellClick}
          cellSize={window.innerWidth < 640 ? 80 : window.innerWidth < 768 ? 100 : 200}
          padding={window.innerWidth < 640 ? 3 : window.innerWidth < 768 ? 5 : 0}
          scaleFactor={1}
          popupHeight={popupHeight}
        />
      </div>

      <div
        className="fixed top-0 left-0 right-0 transition-all duration-400 ease-out flex items-center justify-center font-mono text-xs tracking-wide md:text-sm"
        style={{
          opacity: hoverData ? 1 : 0,
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0))',
          height: '3rem',
          transform: `translateY(${selectedData ? '-48px' : '0'})`
        }}
      >
        {hoverData && (
          <div className="flex items-center gap-8 px-6 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-3">
              <span className="uppercase text-[10px] text-white/40 font-medium tracking-widest">Position</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/60">{hoverData.row}</span>
                <span className="text-white/20">/</span>
                <span className="text-white/60">{hoverData.col}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="uppercase text-[10px] text-white/40 font-medium tracking-widest">Seed</span>
              <span className="text-white/80 font-medium">#{hoverData.seed?.length > 10 ? hoverData.seed?.slice(0, 5) + '...' + hoverData.seed?.slice(-5) : hoverData.seed}</span>
            </div>
          </div>
        )}
      </div>

      <div
        ref={popupRef}
        className="fixed bottom-0 left-0 right-0 sm:h-[28rem] md:h-[20rem] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 overflow-hidden h-screen sm:h-auto"
        style={{
          transform: `translateY(${selectedData ? '0' : '100%'})`,
        }}
        onClick={(evt) => {
          evt.stopPropagation();
        }}
      >
        <div className="relative h-full bg-black/90 backdrop-blur-md border-t border-white/5">
          <button
            onClick={() => setSelectedData(null)}
            className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors sm:hidden"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <div className="p-3 md:p-8 h-full">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 h-full max-h-full">
              <div className="hidden md:block flex-shrink-0 w-56 h-56 rounded-xl border border-white/5 overflow-hidden" style={{
                backgroundImage: `url(${renderedPNGsBlobUrls[selectedData?.hash || '']?.blobUrl})`,
                backgroundSize: 'cover',
              }}>
                {selectedData ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="space-y-2 text-center">
                      {/* <div className="text-3xl font-mono text-white/90 font-medium">#{selectedData.seed}</div> */}
                      <div className="flex items-center gap-1.5 text-xs text-white/90 bg-black/50 px-2 py-1.5 md:px-3 md:py-2 rounded-lg">
                        <span>{selectedData.row}</span>
                        <span className="text-white/20">/</span>
                        <span>{selectedData.col}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                <div className="flex items-center justify-between mb-3 md:mb-6">
                  <div className="space-y-1">
                    <h2 className="text-base md:text-lg font-mono font-medium text-white/90">
                      #{selectedData?.seed?.length || 0 > 10 ? selectedData?.seed?.slice(0, 5) + '...' + selectedData?.seed?.slice(-5) : selectedData?.seed}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:gap-x-8 md:gap-y-6 pb-4 w-full">
                  <div className="md:hidden col-span-2 aspect-square rounded-xl border border-white/5 overflow-hidden" style={{
                    backgroundImage: `url(${renderedPNGsBlobUrls[selectedData?.hash || '']?.blobUrl})`
                  }}>
                    {selectedData ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="space-y-2 text-center">
                          {/* <div className="text-3xl font-mono text-white/90 font-medium">#{selectedData.seed.length > 10 ? selectedData.seed.slice(0, 10) + '...' : selectedData.seed}</div> */}
                          {/* <div className="flex items-center gap-1.5 text-xs text-white/40">
                            <span>{selectedData.row}</span>
                            <span className="text-white/20">/</span>
                            <span>{selectedData.col}</span>
                          </div> */}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="col-span-2">
                    <div className="space-y-4">
                      {transactions.filter(tx => tx.signature === selectedData?.hash).slice(0, 1).map(tx => {
                        if (tx.signature === selectedData?.hash) {
                          return (
                            <div key={tx.signature} className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-widest text-white/40">From</p>
                                  <p className="font-mono text-[10px] md:text-xs text-white/60 truncate max-w-[180px] sm:max-w-none">
                                    {tx.from}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-widest text-white/40">Amount</p>
                                  <p className="font-mono text-[10px] md:text-xs text-white/60">
                                    {(Number(tx.amount) / 1000000).toFixed(4)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-widest text-white/40">Slot</p>
                                  <p className="font-mono text-[10px] md:text-xs text-white/60">
                                    {tx.slot.toLocaleString()}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-widest text-white/40">Block Time</p>
                                  <p className="font-mono text-[10px] md:text-xs text-white/60">
                                    {new Date(tx.blockTime * 1000).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <p className="text-[10px] uppercase tracking-widest text-white/40">Activity</p>
                                  <p className="font-mono text-[10px] md:text-xs text-white/60 capitalize">
                                    {tx.activity_type}
                                  </p>
                                </div>
                              </div>

                              <div className="pt-2">
                                <a
                                  href={`https://solscan.io/tx/${tx.signature}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/80"
                                >
                                  <span className="text-xs">View on Solscan</span>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 3V9M21 3H15M21 3L13 11M10 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H17C18.1046 19 19 18.1046 19 17V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Color Palette</p>
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
                      {selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.stats.palette.map((color, index) => (
                        <div
                          key={index}
                          className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-md border border-white/10"
                          style={{
                            backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Position</p>
                    <div className="flex items-center gap-1.5 font-mono text-white/80">
                      <span>{selectedData?.row}</span>
                      <span className="text-white/20">/</span>
                      <span>{selectedData?.col}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Seed</p>
                    <p className="font-mono text-white/80">#{selectedData?.seed.slice(0, 6)}...</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Tier</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.tier === 'legendary' ? 'bg-yellow-500/20 text-yellow-300' :
                        selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.tier === 'rare' ? 'bg-purple-500/20 text-purple-300' :
                          selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.tier === 'uncommon' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                        }`}>
                        {selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.tier.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Background</p>
                    <p className="text-white/80 text-sm capitalize">
                      {selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.stats.backgroundStyle}
                    </p>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Shape Distribution</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                      {selectedData?.hash && Object.entries(renderedPNGsBlobUrls[selectedData.hash]?.stats.shapeTypes || {}).map(([type, count]) => (
                        <div key={type} className="bg-white/5 rounded-lg p-2 md:p-3">
                          <p className="text-white/40 text-[11px] md:text-xs capitalize mb-1">{type}</p>
                          <p className="text-white/90 font-mono text-base md:text-lg">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Total Shapes</p>
                    <p className="text-white/80 font-mono text-2xl">
                      {selectedData?.hash && renderedPNGsBlobUrls[selectedData.hash]?.stats.shapeCount}
                    </p>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Hash</p>
                    <p className="font-mono text-[10px] md:text-xs text-white/60 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 rounded-lg break-all">
                      {selectedData?.hash}
                    </p>
                  </div>


                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        @media (max-width: 768px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
        }
      `}</style>
    </>
  )
}

