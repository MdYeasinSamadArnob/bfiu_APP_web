import { Node, Edge, MarkerType } from 'reactflow';

export interface ArchitectureNodeData {
  label: string;
  subLabel?: string;
  description?: string;
  icon?: string;
  details?: string[];
  type?: 'service' | 'database' | 'interface' | 'security' | 'integration';
}

export const initialNodes: Node[] = [
  // 1. Core Banking Systems
  {
    id: 'cbs',
    type: 'custom',
    position: { x: 250, y: 0 },
    data: {
      label: 'Core Banking Systems',
      subLabel: 'CBS / Trade Systems (Oracle / Postgres)',
      icon: 'Database',
      type: 'database',
      details: [
        'Source of Truth for financial data',
        'Handles high-volume transactions',
        'Legacy systems integration'
      ]
    },
  },
  // 2. UMS / Security
  {
    id: 'ums',
    type: 'custom',
    position: { x: 800, y: 0 },
    data: {
      label: 'UMS / Security',
      subLabel: 'Keycloak (RBAC / SSO)',
      icon: 'Shield',
      type: 'security',
      details: [
        'Centralized Identity Management',
        'Role-Based Access Control',
        'Single Sign-On (SSO)'
      ]
    },
  },
  // 3. Change Data Capture
  {
    id: 'cdc',
    type: 'custom',
    position: { x: 250, y: 150 },
    data: {
      label: 'Change Data Capture',
      subLabel: 'Debezium CDC + NiFi',
      icon: 'RefreshCw',
      type: 'integration',
      details: [
        'Real-time database log mining',
        'Zero-impact on source DB',
        'Apache NiFi for transformation'
      ]
    },
  },
  // 4. Application Platform
  {
    id: 'app-platform',
    type: 'custom',
    position: { x: 800, y: 150 },
    data: {
      label: 'Application Platform',
      subLabel: 'Spring Boot Gateway (API / BFF)',
      icon: 'Server',
      type: 'service',
      details: [
        'API Gateway Pattern',
        'Backend for Frontend (BFF)',
        'Request Routing & Rate Limiting'
      ]
    },
  },
  // 5. Event Backbone
  {
    id: 'kafka',
    type: 'custom',
    position: { x: 250, y: 300 },
    data: {
      label: 'Event Backbone',
      subLabel: 'Apache Kafka',
      icon: 'Activity',
      type: 'integration',
      details: [
        'High-throughput event streaming',
        'Decoupled architecture',
        'Message persistence'
      ]
    },
  },
  // 6. User Interfaces
  {
    id: 'ui',
    type: 'customGroup',
    position: { x: 600, y: 300 },
    style: { width: 500, height: 120, border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '10px' },
    data: { label: 'User Interfaces' },
  },
  {
    id: 'ui-superset',
    type: 'custom',
    position: { x: 20, y: 40 },
    parentNode: 'ui',
    extent: 'parent',
    data: {
      label: 'Superset / Grafana',
      icon: 'BarChart',
      type: 'interface',
    },
  },
  {
    id: 'ui-bpm',
    type: 'custom',
    position: { x: 180, y: 40 },
    parentNode: 'ui',
    extent: 'parent',
    data: {
      label: 'Business Process Mgmt',
      icon: 'ClipboardList',
      type: 'interface',
    },
  },
  {
    id: 'ui-ai',
    type: 'custom',
    position: { x: 340, y: 40 },
    parentNode: 'ui',
    extent: 'parent',
    data: {
      label: 'AI Assistant/Agent',
      icon: 'Bot',
      type: 'interface',
    },
  },
  // 7. Analytical Datamart
  {
    id: 'doris',
    type: 'custom',
    position: { x: 500, y: 500 },
    data: {
      label: 'Analytical Datamart',
      subLabel: 'Apache Doris (HSAP Tables)',
      icon: 'Database',
      type: 'database',
      details: [
        'Real-time Analytics',
        'High-speed Ad-hoc Queries',
        'Unified Data Storage'
      ]
    },
  },
  // 8. Search & Logs (Optional)
  {
    id: 'search',
    type: 'customGroup',
    position: { x: 0, y: 600 },
    style: { width: 200, height: 200, border: '1px dashed #cbd5e1', borderRadius: '8px' },
    data: { label: 'Optional Search & Logs' },
  },
  {
    id: 'elasticsearch',
    type: 'custom',
    position: { x: 20, y: 40 },
    parentNode: 'search',
    extent: 'parent',
    data: {
      label: 'Elasticsearch Cluster',
      icon: 'Search',
      type: 'database',
    },
  },
  {
    id: 'kibana',
    type: 'custom',
    position: { x: 20, y: 120 },
    parentNode: 'search',
    extent: 'parent',
    data: {
      label: 'Kibana Access',
      icon: 'Monitor',
      type: 'interface',
    },
  },
  // 9. EAIP
  {
    id: 'eaip',
    type: 'customGroup',
    position: { x: 250, y: 650 },
    style: { width: 450, height: 250, border: '2px solid #6366f1', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.05)' },
    data: { label: 'Era AI Intelligence Platform (EAIP)' },
  },
  {
    id: 'eaip-orch',
    type: 'custom',
    position: { x: 20, y: 50 },
    parentNode: 'eaip',
    extent: 'parent',
    data: {
      label: 'Agent Orchestrator',
      subLabel: 'Multi-Hop Logic',
      icon: 'Cpu',
      type: 'service',
    },
  },
  {
    id: 'eaip-langgraph',
    type: 'custom',
    position: { x: 240, y: 50 },
    parentNode: 'eaip',
    extent: 'parent',
    data: {
      label: 'LangGraph Agents',
      subLabel: '+ Tool Gateway',
      icon: 'Network',
      type: 'service',
    },
  },
  {
    id: 'eaip-rag',
    type: 'custom',
    position: { x: 20, y: 150 },
    parentNode: 'eaip',
    extent: 'parent',
    data: {
      label: 'RAG Engine',
      subLabel: 'Evidence & Narrative',
      icon: 'BookOpen',
      type: 'service',
    },
  },
  {
    id: 'eaip-ml',
    type: 'custom',
    position: { x: 240, y: 150 },
    parentNode: 'eaip',
    extent: 'parent',
    data: {
      label: 'ML Models',
      subLabel: 'XGBoost / PyTorch',
      icon: 'Brain',
      type: 'service',
    },
  },
  // 10. RMS
  {
    id: 'rms',
    type: 'customGroup',
    position: { x: 750, y: 650 },
    style: { width: 400, height: 150, border: '1px dashed #cbd5e1', borderRadius: '8px' },
    data: { label: 'RMS - Real-Time Monitoring' },
  },
  {
    id: 'rms-kogito',
    type: 'custom',
    position: { x: 20, y: 50 },
    parentNode: 'rms',
    extent: 'parent',
    data: {
      label: 'Kogito Rules Engine',
      icon: 'Settings',
      type: 'service',
    },
  },
  {
    id: 'rms-ml',
    type: 'custom',
    position: { x: 200, y: 50 },
    parentNode: 'rms',
    extent: 'parent',
    data: {
      label: 'Real-Time ML Scoring',
      icon: 'Zap',
      type: 'service',
    },
  },
  // 11. Case Management
  {
    id: 'case-mgmt',
    type: 'custom',
    position: { x: 750, y: 850 },
    data: {
      label: 'Case Management',
      subLabel: 'Flowable BPM',
      icon: 'Briefcase',
      type: 'service',
    },
  },
  // 12. Regulatory Reporting
  {
    id: 'reg-reporting',
    type: 'custom',
    position: { x: 750, y: 980 },
    data: {
      label: 'Regulatory Reporting',
      subLabel: 'STR Export Service',
      icon: 'FileText',
      type: 'service',
    },
  },
  // 13. Central Analytical Engine
  {
    id: 'central-engine',
    type: 'custom',
    position: { x: 1200, y: 650 },
    data: {
      label: 'Central Analytical Engine',
      subLabel: 'Hybrid Search (HSAP)',
      icon: 'Globe',
      type: 'service',
      details: [
        'Real-time + Historical analytics',
        'Handles 95% of workloads',
        'Kibana log exploration'
      ]
    },
  },
];

export const initialEdges: Edge[] = [
  // CBS -> CDC
  { id: 'e1', source: 'cbs', target: 'cdc', animated: true },
  // CDC -> Kafka
  { id: 'e2', source: 'cdc', target: 'kafka', animated: true },
  // Kafka -> Doris
  { id: 'e3', source: 'kafka', target: 'doris', animated: true },
  // Kafka -> Elasticsearch
  { id: 'e4', source: 'kafka', target: 'search', type: 'smoothstep', style: { strokeDasharray: '5,5' } },
  // UMS -> App Platform
  { id: 'e5', source: 'ums', target: 'app-platform' },
  // App Platform -> UI
  { id: 'e6', source: 'app-platform', target: 'ui' },
  // UI -> Doris (Queries)
  { id: 'e7', source: 'ui', target: 'doris', animated: true },
  // Doris -> EAIP
  { id: 'e8', source: 'doris', target: 'eaip', animated: true },
  // Doris -> RMS
  { id: 'e9', source: 'doris', target: 'rms', animated: true },
  // RMS -> Case Mgmt
  { id: 'e10', source: 'rms', target: 'case-mgmt' },
  // Case Mgmt -> Reg Reporting
  { id: 'e11', source: 'case-mgmt', target: 'reg-reporting' },
  // EAIP -> Case Mgmt
  { id: 'e12', source: 'eaip', target: 'case-mgmt' },
  // Doris -> Central Engine
  { id: 'e13', source: 'doris', target: 'central-engine', style: { strokeDasharray: '5,5' } },
];
