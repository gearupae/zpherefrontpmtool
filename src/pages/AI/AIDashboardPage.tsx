import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { SparklesIcon } from '@heroicons/react/24/outline';

type PanelProps = React.PropsWithChildren<{ title: string }>
const Panel: React.FC<PanelProps>=({ title, children })=> (
  <div className="bg-white rounded-lg shadow border p-4">
    <div className="flex items-center mb-3">
      <div className="w-1.5 h-6 rounded bg-gradient-to-b from-blue-500 to-purple-500 mr-3" />
      <h3 className="text-md font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const HelperText: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-gray-500 mt-1">{text}</p>
);

const Section: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const AIDashboardPage: React.FC = () => {
  const dispatch = useDispatch();

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [riskInput, setRiskInput] = useState({ project_id: '', task_id: '', context: '{}' });
  const [riskResult, setRiskResult] = useState<any>(null);

  const [optInput, setOptInput] = useState({ project_id: '', candidates: '[]', tasks: '[]' });
  const [optResult, setOptResult] = useState<any>(null);

  const [nlPrompt, setNlPrompt] = useState('Create a follow-up task for design review next Tuesday.');
  const [nlProject, setNlProject] = useState('');
  const [nlResult, setNlResult] = useState<any>(null);

  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [meetingProject, setMeetingProject] = useState('');
  const [meetingResult, setMeetingResult] = useState<any>(null);

  const [scenarioProject, setScenarioProject] = useState('');
  const [assumptions, setAssumptions] = useState('{"scope_change":"+10%"}');
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  const [forecastProject, setForecastProject] = useState('');
  const [forecastType, setForecastType] = useState('timeline');
  const [forecastInputs, setForecastInputs] = useState('{"velocity": 20}');
  const [forecastResult, setForecastResult] = useState<any>(null);

  const [subscription, setSubscription] = useState<any>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Preload projects for dropdowns to avoid manual ID typing
    (async () => {
      try {
        const { default: apiClient } = await import('../../api/client');
        const resp = await apiClient.get('/projects/');
        console.log('Projects loaded for AI dashboard:', resp.data);
        setProjects(resp.data.map((p: any) => ({ id: p.id, name: p.name })));
      } catch (err: any) {
        console.error('Failed to load projects for AI dashboard:', err);
        // Graceful fallback; dropdowns will still allow manual entry
        setProjects([]);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const { default: apiClient } = await import('../../api/client');
        const resp = await apiClient.get('/subscriptions/');
        console.log('Subscription loaded for AI dashboard:', resp.data);
        setSubscription(resp.data);
        const tier = (resp.data?.tier || '').toString().toLowerCase();
        // Temporarily enable AI for professional and above, or enable for dev if no subscription
        const hasSubscription = resp.data && resp.data.tier;
        if (hasSubscription) {
          setAiEnabled(['professional','business','enterprise'].includes(tier));
        } else {
          // Dev mode: enable AI if no subscription endpoint
          setAiEnabled(true);
        }
      } catch (e) {
        console.log('No subscription endpoint, enabling AI for development');
        setAiEnabled(true);
      }
    })();
  }, []);

  const callAPI = async (path: string, body: any) => {
    const { default: apiClient } = await import('../../api/client');
    if (!aiEnabled) {
      throw new Error('AI features are not available on your current plan.');
    }
    const resp = await apiClient.post(path, body);
    return resp.data;
  };

  // Safe parser that accepts simple JSON-like text
  function safeParseJSON(input: string, fallback: any) {
    if (!input || typeof input !== 'string') return fallback;
    try {
      return JSON.parse(input);
    } catch {
      // attempt a very light transform for single quotes
      try {
        const normalized = input.replace(/'/g, '"');
        return JSON.parse(normalized);
      } catch {
        return fallback;
      }
    }
  }

  const onPredictRisk = async () => {
    console.log('onPredictRisk called with:', riskInput);
    try {
      const payload = {
        project_id: riskInput.project_id,
        task_id: riskInput.task_id || null,
        context: safeParseJSON(riskInput.context, {})
      };
      console.log('Sending risk prediction request:', payload);
      const data = await callAPI('/ai/risk/predict', payload);
      console.log('Risk prediction response:', data);
      setRiskResult(data);
      dispatch(addNotification({ type: 'success', title: 'Risk predicted', message: 'AI risk score generated' }));
    } catch (e:any) {
      console.error('Risk prediction error:', e);
      dispatch(addNotification({ type: 'error', title: 'Error', message: e.response?.data?.detail || e.message || 'Failed to predict risk' }));
    }
  };

  const onOptimize = async () => {
    try {
      const data = await callAPI('/ai/resources/optimize', {
        project_id: optInput.project_id,
        candidates: safeParseJSON(optInput.candidates, []),
        tasks: safeParseJSON(optInput.tasks, [])
      });
      setOptResult(data);
      dispatch(addNotification({ type: 'success', title: 'Optimization complete', message: 'Assignments suggested' }));
    } catch (e:any) {
      dispatch(addNotification({ type: 'error', title: 'Error', message: e.response?.data?.detail || 'Failed to optimize' }));
    }
  };

  const onNL = async () => {
    try {
      const data = await callAPI('/ai/nl/command', { prompt: nlPrompt, project_id: nlProject || null });
      setNlResult(data);
      dispatch(addNotification({ type: 'success', title: 'NL processed', message: 'Plan generated' }));
    } catch (e:any) {
      dispatch(addNotification({ type: 'error', title: 'Error', message: e.response?.data?.detail || 'Failed to process NL' }));
    }
  };

  const onSummarize = async () => {
    try {
      const data = await callAPI('/ai/meeting/summarize', { project_id: meetingProject || null, transcript: meetingTranscript });
      setMeetingResult(data);
      dispatch(addNotification({ type: 'success', title: 'Meeting summarized', message: 'Action items extracted' }));
    } catch (e:any) {
      dispatch(addNotification({ type: 'error', title: 'Error', message: e.response?.data?.detail || 'Failed to summarize' }));
    }
  };

  const onScenario = async () => {
    try {
      const data = await callAPI('/ai/scenario/what-if', { project_id: scenarioProject, assumptions: safeParseJSON(assumptions, {}) });
      setScenarioResult(data);
      dispatch(addNotification({ type: 'success', title: 'Scenario analyzed', message: 'Impact calculated' }));
    } catch (e:any) {
      dispatch(addNotification({ type: 'error', title: 'Error', message: e.response?.data?.detail || 'Failed to run scenario' }));
    }
  };

  const onForecast = async () => {
    try {
      const data = await callAPI('/ai/forecast/predict', { project_id: forecastProject, forecast_type: forecastType, inputs: safeParseJSON(forecastInputs, {}) });
      setForecastResult(data);
      dispatch(addNotification({ type: 'success', title: 'Forecast ready', message: 'Predictions generated' }));
    } catch (e:any) {
      dispatch(addNotification({ type: 'error', title: 'Error', message: e.response?.data?.detail || 'Failed to forecast' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title font-bold">AI Assistant</h1>
          <div className="text-gray-600 mt-1 text-sm">Insights, automation, and predictions for your work</div>
        </div>
        {subscription && (
          <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200">Plan: {String(subscription.tier || '').toUpperCase()}</span>
        )}
      </div>
      {!aiEnabled && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          AI features are not available on your current plan. <a className="underline" href="/pricing">Upgrade your plan</a> to enable AI.
        </div>
      )}

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colorful badges like other pages */}
        <div className="col-span-1 lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded">Assistant</span>
            <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded">Automation</span>
            <span className="inline-flex items-center px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded">Insights</span>
          </div>
        </div>
        <Panel title="Intelligent Risk Prediction & Early Alerts">
          <div className="space-y-2">
            <Section label="Project">
              <select className="input" value={riskInput.project_id} onChange={(e)=>setRiskInput({...riskInput, project_id:e.target.value})}>
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <HelperText text="Choose the project to evaluate. You can also paste an ID if the list is empty." />
            </Section>
            <Section label="Task (optional)">
              <input className="input" placeholder="Task ID (optional)" value={riskInput.task_id} onChange={(e)=>setRiskInput({...riskInput, task_id:e.target.value})} />
              <HelperText text="If you want risk for a specific task, paste its ID. Leave blank for project-level risk." />
            </Section>
            <Section label="Context (optional)">
              <textarea className="input" rows={3} placeholder="Eg: { 'blocked_by': 2, 'budget_overrun': true }" value={riskInput.context} onChange={(e)=>setRiskInput({...riskInput, context:e.target.value})} />
              <HelperText text="You can provide simple hints; strict JSON is not required—I'll try to parse it." />
            </Section>
            <button
              onClick={onPredictRisk}
              disabled={!riskInput.project_id || !aiEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Predict Risk</span>
            </button>
            {riskResult && (
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(riskResult, null, 2)}</pre>
            )}
          </div>
        </Panel>

        <Panel title="Dynamic Resource Allocation & Optimization">
          <div className="space-y-2">
            <Section label="Project">
              <select className="input" value={optInput.project_id} onChange={(e)=>setOptInput({...optInput, project_id:e.target.value})}>
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <HelperText text="Pick the project where you want to optimize resources." />
            </Section>
            <Section label="Candidates">
              <textarea className="input" rows={3} placeholder='Eg: [{"id":"u1","skills":["react"]}]' value={optInput.candidates} onChange={(e)=>setOptInput({...optInput, candidates:e.target.value})} />
              <HelperText text="Paste a simple list of people or roles. Keep it short—I'll parse reasonable input." />
            </Section>
            <Section label="Tasks">
              <textarea className="input" rows={3} placeholder='Eg: [{"id":"t1","skills":["frontend"]}]' value={optInput.tasks} onChange={(e)=>setOptInput({...optInput, tasks:e.target.value})} />
              <HelperText text="Paste the set of tasks to allocate. Use plain English or JSON; I'll try to parse it." />
            </Section>
            <button
              onClick={onOptimize}
              disabled={!optInput.project_id || !aiEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Optimize</span>
            </button>
            {optResult && (<pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(optResult, null, 2)}</pre>)}
          </div>
        </Panel>

        <Panel title="Workflow Automation & Conversational Interface">
          <div className="space-y-2">
            <Section label="Project (optional)">
              <select className="input" value={nlProject} onChange={(e)=>setNlProject(e.target.value)}>
                <option value="">No specific project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <HelperText text="Select a project to anchor the plan, or leave empty for a general suggestion." />
            </Section>
            <textarea className="input" rows={3} placeholder="Type a natural language instruction..." value={nlPrompt} onChange={(e)=>setNlPrompt(e.target.value)} />
            <button
              onClick={onNL}
              disabled={!nlPrompt || !aiEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Process</span>
            </button>
            {nlResult && (<pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(nlResult, null, 2)}</pre>)}
          </div>
        </Panel>

        <Panel title="Auto-Generated Meeting Summaries & Action Items">
          <div className="space-y-2">
            <Section label="Project (optional)">
              <select className="input" value={meetingProject} onChange={(e)=>setMeetingProject(e.target.value)}>
                <option value="">No specific project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <HelperText text="Link the summary to a project, or leave empty." />
            </Section>
            <textarea className="input" rows={4} placeholder="Paste transcript/email/chat text here..." value={meetingTranscript} onChange={(e)=>setMeetingTranscript(e.target.value)} />
            <button
              onClick={onSummarize}
              disabled={!meetingTranscript || !aiEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Summarize</span>
            </button>
            {meetingResult && (<pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(meetingResult, null, 2)}</pre>)}
          </div>
        </Panel>

        <Panel title="Scenario Planning / What-If Analysis">
          <div className="space-y-2">
            <Section label="Project">
              <select className="input" value={scenarioProject} onChange={(e)=>setScenarioProject(e.target.value)}>
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <HelperText text="Pick the project for what-if analysis." />
            </Section>
            <textarea className="input" rows={3} placeholder="Assumptions JSON" value={assumptions} onChange={(e)=>setAssumptions(e.target.value)} />
            <button
              onClick={onScenario}
              disabled={!scenarioProject || !aiEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Analyze</span>
            </button>
            {scenarioResult && (<pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(scenarioResult, null, 2)}</pre>)}
          </div>
        </Panel>

        <Panel title="Predictive Budget & Timeline Forecasting">
          <div className="space-y-2">
            <Section label="Project">
              <select className="input" value={forecastProject} onChange={(e)=>setForecastProject(e.target.value)}>
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <HelperText text="Pick the project to forecast." />
            </Section>
            <Section label="Forecast type">
              <select className="input" value={forecastType} onChange={(e)=>setForecastType(e.target.value)}>
                <option value="timeline">Timeline</option>
                <option value="budget">Budget</option>
              </select>
              <HelperText text="Choose timeline to forecast delivery dates or budget for cost projections." />
            </Section>
            <Section label="Inputs">
              <textarea className="input" rows={3} placeholder='Eg: {"velocity": 20} or {"monthly_budget": 20000}' value={forecastInputs} onChange={(e)=>setForecastInputs(e.target.value)} />
              <HelperText text="Provide a couple of simple inputs. Plain English or light JSON is okay." />
            </Section>
            <button
              onClick={onForecast}
              disabled={!forecastProject || !aiEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Forecast</span>
            </button>
            {forecastResult && (<pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(forecastResult, null, 2)}</pre>)}
          </div>
        </Panel>
      </div>

      <Panel title="Real-Time Performance Dashboards with AI Insights">
        <p className="text-sm text-gray-600">Use the above tools to generate insights. We can expand this with charts fed by /analytics and overlay AI insights.</p>
      </Panel>

      <Panel title="Learning Engine & Intelligent Project Selection">
        <p className="text-sm text-gray-600">Backed by historical data; scoring endpoints can be added similarly to /ai to rank projects by ROI and risk.</p>
      </Panel>
    </div>
  );
};

export default AIDashboardPage;

