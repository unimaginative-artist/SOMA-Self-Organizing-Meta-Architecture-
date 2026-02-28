import React, { useState } from 'react';
import { Sparkles, Loader2, Target, Clock, Zap, CheckCircle2, Circle, ChevronRight, Brain, Network } from 'lucide-react';
import SomaThinking from './SomaThinking';

interface PlanStep {
  id: string;
  title: string;
  description: string;
  estimate?: string;
  complexity: 'low' | 'medium' | 'high';
  dependencies?: string[];
  arbiterSuggestion?: string;
  completed?: boolean;
  assignedArbiterRole?: string;
}

interface Plan {
  goal: string;
  summary: string;
  steps: PlanStep[];
  totalEstimate?: string;
  arbitersUsed?: string[];
  reasoning?: string;
  planId?: string;
  createdAt?: string;
}

interface PlanningModeProps {
  onPlanCreated?: (plan: Plan) => void;
  onExecuteStep?: (step: PlanStep) => Promise<void>;
}

const PlanningMode: React.FC<PlanningModeProps> = ({ onPlanCreated, onExecuteStep }) => {
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);

  const handleGeneratePlan = async () => {
    if (!goal.trim()) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/pulse/arbiter/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal,
          context: { cwd: '.' }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const plan: Plan = {
          goal,
          summary: result.summary,
          steps: result.steps || [],
          totalEstimate: result.totalEstimate,
          arbitersUsed: result.arbitersUsed,
          reasoning: result.reasoning,
          planId: result.planId,
          createdAt: new Date().toISOString()
        };
        setCurrentPlan(plan);
        if (onPlanCreated) {
          onPlanCreated(plan);
        }
      }
    } catch (error) {
      console.error('[PlanningMode] Error generating plan:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecuteClick = async (step: PlanStep) => {
    if (!onExecuteStep) return;
    
    setExecutingStepId(step.id);
    try {
      await onExecuteStep(step);
      // Auto-mark as completed on success
      await handleToggleStep(step.id);
    } catch (error) {
      console.error("Step execution failed:", error);
    } finally {
      setExecutingStepId(null);
    }
  };

  const handleToggleStep = async (stepId: string) => {
    if (!currentPlan) return;

    const updatedSteps = currentPlan.steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );

    const updatedPlan = { ...currentPlan, steps: updatedSteps };
    setCurrentPlan(updatedPlan);

    // Check if plan is completed
    const allCompleted = updatedSteps.every(s => s.completed);
    if (allCompleted && currentPlan.planId) {
      try {
        await fetch(`/api/pulse/arbiter/plan/${currentPlan.planId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            duration: Date.now() - new Date(currentPlan.createdAt || Date.now()).getTime(),
            stepsCompleted: updatedSteps.length,
            completedAt: new Date().toISOString()
          })
        });
        console.log('[PlanningMode] 🎓 Plan completion sent to learning pipeline');
      } catch (error) {
        console.error('[PlanningMode] Failed to send completion data:', error);
      }
    }
  };

  const complexityColors = {
    low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' }
  };

  const completedSteps = currentPlan?.steps.filter(s => s.completed).length || 0;
  const totalSteps = currentPlan?.steps.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {!currentPlan ? (
        /* Planning Input */
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
            <Target className="w-8 h-8 text-blue-400" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-zinc-200">Planning Mode</h2>
            <p className="text-xs text-zinc-500 max-w-md">
              Describe your goal and SOMA will break it down into a structured plan with actionable steps, estimates, and arbiter recommendations.
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-3">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., 'I'd like to work on command-bridge and add a new feature for XYZ' or 'Refactor the authentication system with better security'"
              className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
              disabled={generating}
            />

            {generating ? (
              <div className="w-full bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 rounded-lg">
                <SomaThinking 
                  message="SOMA Reasoning..."
                  subtext="PROMETHEUS hemisphere activating for strategic breakdown"
                />
              </div>
            ) : (
              <button
                onClick={handleGeneratePlan}
                disabled={!goal.trim()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 rounded-lg text-sm font-bold text-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Brain className="w-4 h-4" />
                <span>Generate Execution Plan</span>
              </button>
            )}

            {/* Example Goals */}
            <div className="pt-2 space-y-2">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Example Goals</div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Add user authentication to the command bridge',
                  'Refactor the file system module with better error handling',
                  'Create a new dashboard component with real-time metrics'
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setGoal(example)}
                    className="text-left px-3 py-2 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/50 rounded text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors"
                    disabled={generating}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Plan Display */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-zinc-200">
          {/* Plan Header */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-[9px] text-blue-400 uppercase tracking-wider font-bold">Goal</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-200">{currentPlan.goal}</h3>
              </div>
              <button
                onClick={() => setCurrentPlan(null)}
                className="px-3 py-1 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                New Plan
              </button>
            </div>

            {currentPlan.summary && (
              <p className="text-xs text-zinc-400 leading-relaxed">{currentPlan.summary}</p>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-zinc-500 font-bold">Progress</span>
                <span className="text-zinc-400">{completedSteps} / {totalSteps} steps</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center space-x-3 text-[9px]">
              {currentPlan.totalEstimate && (
                <div className="flex items-center space-x-1 text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <span>{currentPlan.totalEstimate}</span>
                </div>
              )}
              {currentPlan.arbitersUsed && currentPlan.arbitersUsed.length > 0 && (
                <div className="flex items-center space-x-1 text-zinc-500">
                  <Network className="w-3 h-3" />
                  <span>{currentPlan.arbitersUsed.length} arbiters consulted</span>
                </div>
              )}
            </div>
          </div>

          {/* Reasoning */}
          {currentPlan.reasoning && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="w-3 h-3 text-purple-400" />
                <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold">Reasoning</span>
              </div>
              <p className="text-[10px] text-purple-200/70 leading-relaxed">{currentPlan.reasoning}</p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            {currentPlan.steps.map((step, idx) => {
              const colors = complexityColors[step.complexity || 'medium'];
              return (
                <div
                  key={step.id}
                  className={`border rounded-lg p-3 transition-all ${
                    step.completed
                      ? 'bg-emerald-500/5 border-emerald-500/30 opacity-60'
                      : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleStep(step.id)}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-500 transition-colors" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-[9px] font-mono text-zinc-600">Step {idx + 1}</span>
                            <span className={`px-1.5 py-0.5 ${colors.bg} border ${colors.border} rounded text-[8px] font-bold ${colors.text}`}>
                              {step.complexity}
                            </span>
                          </div>
                          <h4 className={`text-xs font-bold ${step.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                            {step.title}
                          </h4>
                        </div>
                        {onExecuteStep && !step.completed && (
                          <button
                            onClick={() => handleExecuteClick(step)}
                            disabled={executingStepId === step.id}
                            className={`px-2 py-1 border rounded text-[9px] font-bold transition-colors flex items-center space-x-1 ${
                              executingStepId === step.id 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 cursor-wait' 
                                : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                            }`}
                          >
                            {executingStepId === step.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Zap className="w-2.5 h-2.5" />
                            )}
                            <span>{executingStepId === step.id ? 'Running...' : 'Execute'}</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-zinc-500 leading-relaxed">{step.description}</p>

                      {/* Step Meta */}
                      <div className="flex items-center space-x-3 text-[9px] text-zinc-600">
                        {step.estimate && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{step.estimate}</span>
                          </div>
                        )}
                        {step.arbiterSuggestion && (
                          <div className="flex items-center space-x-1">
                            <ChevronRight className="w-2.5 h-2.5" />
                            <span className="font-mono">{step.arbiterSuggestion}</span>
                          </div>
                        )}
                      </div>

                      {/* Dependencies */}
                      {step.dependencies && step.dependencies.length > 0 && (
                        <div className="pt-2 border-t border-zinc-800 text-[9px] text-zinc-600">
                          <span className="font-bold">Depends on:</span> {step.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Arbiters Used */}
          {currentPlan.arbitersUsed && currentPlan.arbitersUsed.length > 0 && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Network className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] text-cyan-400 uppercase tracking-wider font-bold">Arbiters Consulted</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentPlan.arbitersUsed.map((arbiter, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[8px] font-mono text-cyan-300">
                    {arbiter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanningMode;