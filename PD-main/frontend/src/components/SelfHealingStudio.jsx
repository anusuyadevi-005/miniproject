import React, { useState } from 'react';
import { Wrench, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Layers, FileCode } from 'lucide-react';

export default function SelfHealingStudio() {
  const [healingStatus, setHealingStatus] = useState(null);
  const [isHealing, setIsHealing] = useState(false);
  const [simulatedBroken, setSimulatedBroken] = useState(false);

  const triggerSimulatedBreak = () => {
    setSimulatedBroken(true);
    setHealingStatus(null);
  };

  const executeSelfHealing = async () => {
    setIsHealing(true);
    try {
      const res = await fetch('/api/self-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdid: '' })
      });
      const data = await res.json();
      setHealingStatus(data);
      setSimulatedBroken(false);
    } catch (err) {
      console.error('Self-healing failed:', err);
    } finally {
      setIsHealing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Wrench className="w-7 h-7 text-cyan-400" />
          <span>Self-Healing Documentation Engine Studio</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Continuous contract verification checking README, module descriptions, diagrams, and API tables against AST code signatures. Repairs only out-of-sync sections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane: Interactive Simulator */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>AST Contract Inspection Target: Discovered Repository Symbols</span>
            </h3>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">
              Target: Repository AST
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gray-950 border border-gray-900 font-mono text-xs text-cyan-300 leading-relaxed">
            {`class UserService {
  // AST Contract: authenticateUser
  async authenticateUser(username: string, password: string${simulatedBroken ? ', mfaCode?: string' : ''}): Promise<UserSession> {
    return await this.authRepo.validate(username, password${simulatedBroken ? ', mfaCode' : ''});
  }
}`}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              onClick={triggerSimulatedBreak}
              disabled={simulatedBroken}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                simulatedBroken
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80'
              }`}
            >
              {simulatedBroken ? '⚠️ Contract Discrepancy Active' : '1. Simulate Code AST Contract Discrepancy'}
            </button>

            <button
              onClick={executeSelfHealing}
              disabled={isHealing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 hover:brightness-110 transition cursor-pointer flex items-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHealing ? 'animate-spin' : ''}`} />
              <span>{isHealing ? 'Executing Self-Healing...' : '2. Run Targeted Self-Healing Repair'}</span>
            </button>
          </div>

          {healingStatus && (
            <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{healingStatus.message}</span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Targeted Section Repairs Executed:
                </div>
                {healingStatus.repairs.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs space-y-1">
                    <div className="font-bold text-cyan-400">{r.type} (ID: {r.artifactId})</div>
                    <div className="text-gray-300">{r.repairDescription}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Self-Healing Architecture Rules */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Self-Healing Engine Rules</span>
          </h3>

          <div className="space-y-3 text-xs text-gray-300">
            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
              <div className="font-semibold text-white">Continuous Contract Verification</div>
              <div className="text-gray-400">Checks diagrams, READMEs, and API tables against AST signatures every commit.</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
              <div className="font-semibold text-white">Targeted Micro-Repair</div>
              <div className="text-gray-400">Only repairs damaged paragraphs or diagram nodes. Never regenerates full documentation.</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
              <div className="font-semibold text-white">Zero Side-Effects</div>
              <div className="text-gray-400">Unrelated modules and package documentations remain 100% untouched.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
