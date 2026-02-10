'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import {
  FiLoader,
  FiSend,
  FiSearch,
  FiPlus,
  FiExternalLink,
  FiFileText,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiMenu,
  FiX,
  FiChevronDown,
  FiAlertCircle,
  FiInfo,
  FiArrowRight,
  FiDatabase,
  FiEdit,
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AGENT_ID = '698b841e26bf0b7cb0c78ff3'

// Theme: Dark Notion-inspired
const THEME_VARS = {
  '--background': '220 17% 10%',
  '--foreground': '210 20% 92%',
  '--card': '220 16% 14%',
  '--card-foreground': '210 20% 92%',
  '--popover': '220 16% 14%',
  '--popover-foreground': '210 20% 92%',
  '--primary': '230 65% 63%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '220 14% 20%',
  '--secondary-foreground': '210 20% 85%',
  '--muted': '220 14% 18%',
  '--muted-foreground': '215 14% 55%',
  '--accent': '220 14% 22%',
  '--accent-foreground': '210 20% 92%',
  '--destructive': '0 62% 55%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '220 13% 22%',
  '--input': '220 13% 22%',
  '--ring': '230 65% 63%',
  '--radius': '0.5rem',
} as React.CSSProperties

interface AgentResultData {
  action_type?: string
  page_title?: string
  page_url?: string
  details?: string
}

interface AgentResultItem {
  title?: string
  url?: string
  type?: string
  last_edited?: string
}

interface AgentResult {
  summary?: string
  data?: AgentResultData
  items?: AgentResultItem[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentResult?: AgentResult
  metadata?: { agent_name?: string; timestamp?: string }
  isError?: boolean
  timestamp: string
}

interface QuickAction {
  label: string
  icon: React.ReactNode
  prompt: string
  description: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Create Page',
    icon: <FiPlus className="h-4 w-4" />,
    prompt: 'Create a new page titled "',
    description: 'Create a new Notion page',
  },
  {
    label: 'Search Pages',
    icon: <FiSearch className="h-4 w-4" />,
    prompt: 'Search for pages about ',
    description: 'Search your workspace',
  },
  {
    label: 'List Databases',
    icon: <FiFileText className="h-4 w-4" />,
    prompt: 'List all my databases in Notion',
    description: 'View all databases',
  },
  {
    label: 'Get Page',
    icon: <FiFileText className="h-4 w-4" />,
    prompt: 'Get the content of the page titled "',
    description: 'Retrieve page details',
  },
  {
    label: 'Create Database',
    icon: <FiPlus className="h-4 w-4" />,
    prompt: 'Create a new database called "',
    description: 'Create a new database',
  },
  {
    label: 'Update Page',
    icon: <FiRefreshCw className="h-4 w-4" />,
    prompt: 'Update the page titled "',
    description: 'Modify existing page',
  },
]

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'sample-1',
    role: 'user',
    content: 'What can you help me with in my Notion workspace? Show me a sample of how you handle requests.',
    timestamp: '2024-06-11T11:59:00Z',
  },
  {
    id: 'sample-2',
    role: 'agent',
    content: '',
    agentResult: {
      summary: 'Sample overview of assistant capabilities and example JSON response provided.',
      data: {
        action_type: 'general',
        page_title: '',
        page_url: '',
        details: 'I can assist you with creating new pages or databases, searching for existing pages, updating content or properties, organizing your workspace, managing database entries, and more within your Notion workspace. My responses provide clear summaries, action details, and structured lists of affected pages or results.',
      },
      items: [
        {
          title: 'Sample: Create a Project Database',
          url: 'https://notion.so/sample-project-database-url',
          type: 'database',
          last_edited: '2024-06-11T10:30:00Z',
        },
        {
          title: 'Sample: Update Meeting Notes Page',
          url: 'https://notion.so/sample-meeting-notes-page-url',
          type: 'page',
          last_edited: '2024-06-05T14:45:00Z',
        },
        {
          title: 'Sample: Search Results - Marketing',
          url: 'https://notion.so/search-marketing-results',
          type: 'search',
          last_edited: '2024-06-07T09:15:00Z',
        },
      ],
    },
    metadata: {
      agent_name: 'Notion Power Agent',
      timestamp: '2024-06-11T12:00:00Z',
    },
    timestamp: '2024-06-11T12:00:00Z',
  },
  {
    id: 'sample-3',
    role: 'user',
    content: 'Search for pages about marketing',
    timestamp: '2024-06-11T12:01:00Z',
  },
  {
    id: 'sample-4',
    role: 'agent',
    content: '',
    agentResult: {
      summary: 'Found 2 pages matching your search for "marketing".',
      data: {
        action_type: 'search',
        page_title: '',
        page_url: '',
        details: 'Searched your Notion workspace for pages related to "marketing". Found 2 results that match your query.',
      },
      items: [
        {
          title: 'Q3 Marketing Strategy',
          url: 'https://notion.so/q3-marketing-strategy',
          type: 'page',
          last_edited: '2024-06-10T16:20:00Z',
        },
        {
          title: 'Marketing Campaign Tracker',
          url: 'https://notion.so/marketing-campaign-tracker',
          type: 'database',
          last_edited: '2024-06-09T11:30:00Z',
        },
      ],
    },
    metadata: {
      agent_name: 'Notion Power Agent',
      timestamp: '2024-06-11T12:01:30Z',
    },
    timestamp: '2024-06-11T12:01:30Z',
  },
]

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function getTypeColor(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'database':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'page':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'search':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    default:
      return 'bg-primary/15 text-primary border-primary/30'
  }
}

function getActionColor(action?: string): string {
  switch (action?.toLowerCase()) {
    case 'create':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'search':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'update':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'delete':
      return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'general':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    default:
      return 'bg-primary/15 text-primary border-primary/30'
  }
}

function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return []
  const lines = text.split('\n')
  return lines.map((line, i) => {
    let processed: React.ReactNode = line

    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-semibold mt-3 mb-1">{line.slice(3)}</h2>
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-xl font-bold mt-3 mb-1">{line.slice(2)}</h1>
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-muted-foreground mt-1.5 text-xs">--</span>
          <span>{line.slice(2)}</span>
        </div>
      )
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }

    // Bold text
    const boldRegex = /\*\*(.*?)\*\*/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index))
      }
      parts.push(<strong key={`b-${i}-${match.index}`} className="font-semibold">{match[1]}</strong>)
      lastIndex = match.index + match[0].length
    }
    if (parts.length > 0) {
      if (lastIndex < line.length) parts.push(line.slice(lastIndex))
      return <p key={i} className="my-0.5">{parts}</p>
    }

    return <p key={i} className="my-0.5">{processed}</p>
  })
}

function AgentResponseCard({ result, metadata }: { result?: AgentResult; metadata?: ChatMessage['metadata'] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = useCallback(async (text: string, id: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  if (!result) return null

  const summary = result?.summary ?? ''
  const data = result?.data
  const items = Array.isArray(result?.items) ? result.items : []
  const actionType = data?.action_type ?? ''
  const details = data?.details ?? ''
  const pageTitle = data?.page_title ?? ''
  const pageUrl = data?.page_url ?? ''

  return (
    <div className="space-y-3">
      {/* Summary */}
      {summary && (
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground leading-relaxed">{summary}</p>
          </div>
          {actionType && (
            <Badge variant="outline" className={`text-xs shrink-0 ${getActionColor(actionType)}`}>
              {actionType}
            </Badge>
          )}
        </div>
      )}

      {/* Details */}
      {details && (
        <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
          <div className="text-sm text-secondary-foreground leading-relaxed">
            {renderMarkdown(details)}
          </div>
        </div>
      )}

      {/* Page Title and URL */}
      {pageTitle && (
        <div className="flex items-center gap-2 text-sm">
          <FiFileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground font-medium">{pageTitle}</span>
        </div>
      )}
      {pageUrl && (
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <FiExternalLink className="h-3.5 w-3.5" />
          Open in Notion
        </a>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Results ({items.length})</p>
          <div className="space-y-1.5">
            {items.map((item, idx) => (
              <div
                key={`${item?.title ?? ''}-${idx}`}
                className="group bg-secondary/40 hover:bg-secondary/70 rounded-lg p-3 border border-border/30 hover:border-border/60 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item?.type && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTypeColor(item.type)}`}>
                          {item.type}
                        </Badge>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{item?.title ?? 'Untitled'}</span>
                    </div>
                    {item?.last_edited && (
                      <p className="text-xs text-muted-foreground">
                        Edited {formatDate(item.last_edited)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item?.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Open in Notion"
                      >
                        <FiExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleCopy(item?.url ?? item?.title ?? '', `item-${idx}`)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy link"
                    >
                      {copiedId === `item-${idx}` ? (
                        <FiCheck className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <FiCopy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata?.timestamp && (
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          {metadata?.agent_name ?? 'Agent'} -- {formatDate(metadata.timestamp)}
        </p>
      )}
    </div>
  )
}

function SkeletonResponse() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-14 w-full bg-muted/50 rounded-lg" />
        <div className="h-14 w-full bg-muted/50 rounded-lg" />
      </div>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sampleDataOn, setSampleDataOn] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [userId, setUserId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sid = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    setSessionId(sid)
    setUserId(uid)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const displayedMessages = sampleDataOn && messages.length === 0 ? SAMPLE_MESSAGES : messages

  const handleSend = useCallback(async (messageText?: string) => {
    const msg = (messageText ?? inputValue).trim()
    if (!msg || isLoading) return

    setInputValue('')
    setError(null)

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const apiResult = await callAIAgent(msg, AGENT_ID, {
        user_id: userId,
        session_id: sessionId,
      })

      if (apiResult.success && apiResult.response) {
        const agentData = apiResult.response?.result as AgentResult | undefined
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: typeof agentData === 'string' ? agentData : '',
          agentResult: typeof agentData === 'object' ? agentData : undefined,
          metadata: apiResult.response?.metadata,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, agentMsg])
      } else {
        const errText = apiResult.error ?? apiResult.response?.message ?? 'An unexpected error occurred'
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'agent',
          content: errText,
          isError: true,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errMsg])
        setError(errText)
      }
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'Network error'
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: errText,
        isError: true,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
      setError(errText)
    } finally {
      setIsLoading(false)
      setActiveAgentId(null)
    }
  }, [inputValue, isLoading, userId, sessionId])

  const handleQuickAction = useCallback((prompt: string) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const SUGGESTION_CHIPS = [
    'What can you help me with?',
    'List all my databases',
    'Search for project pages',
    'Create a new meeting notes page',
  ]

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 top-0 left-0 h-screen w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <FiFileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">Notion Power Agent</h1>
                <p className="text-[10px] text-muted-foreground">Workspace Management</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-accent text-muted-foreground"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Quick Actions</p>
          <div className="space-y-1">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.prompt)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150 group"
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm leading-tight">{action.label}</span>
                  <span className="block text-[10px] text-muted-foreground leading-tight">{action.description}</span>
                </div>
                <FiArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">History</p>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {messages.length === 0 && !sampleDataOn && (
            <p className="text-xs text-muted-foreground/60 px-1">No conversations yet</p>
          )}
          {displayedMessages.filter(m => m.role === 'user').map((msg) => (
            <button
              key={msg.id}
              onClick={() => {
                if (!sampleDataOn) {
                  setInputValue(msg.content)
                  inputRef.current?.focus()
                }
              }}
              className="w-full text-left px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors truncate mb-0.5"
            >
              {msg.content}
            </button>
          ))}
        </div>

        {/* Agent Info */}
        <div className="p-3 border-t border-border">
          <div className="bg-secondary/50 rounded-lg p-2.5 space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agent Status</p>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${activeAgentId ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-xs text-secondary-foreground">Notion Power Agent</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {activeAgentId ? 'Processing request...' : 'Ready'}
            </p>
            <p className="text-[10px] text-muted-foreground/50 font-mono truncate">ID: {AGENT_ID}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            >
              <FiMenu className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-sm font-medium text-foreground">Notion Power Agent</h2>
              <p className="text-[10px] text-muted-foreground">Manage your Notion workspace with AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={sampleDataOn}
                onCheckedChange={setSampleDataOn}
              />
            </div>
          </div>
        </header>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {displayedMessages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <FiFileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to Notion Power Agent</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                  Your AI assistant for managing Notion workspaces. Create pages, search content, manage databases, and organize your workspace -- all through natural language.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      className="px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent text-sm text-secondary-foreground hover:text-foreground transition-all duration-200 text-left group"
                    >
                      <span className="flex items-center gap-2">
                        <FiArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        {chip}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {displayedMessages.map((msg) => (
              <div key={msg.id} className={`mb-5 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full max-w-[85%]'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  ) : msg.isError ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FiAlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      {msg.agentResult ? (
                        <AgentResponseCard result={msg.agentResult} metadata={msg.metadata} />
                      ) : msg.content ? (
                        <div className="text-sm text-foreground leading-relaxed">
                          {renderMarkdown(msg.content)}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No response content</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading state */}
            {isLoading && (
              <div className="mb-5 flex justify-start">
                <div className="w-full max-w-[85%]">
                  <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <FiLoader className="h-4 w-4 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Notion Power Agent is working...</span>
                    </div>
                    <SkeletonResponse />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error banner */}
        {error && !isLoading && (
          <div className="mx-4 mb-2">
            <div className="max-w-3xl mx-auto bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiAlertCircle className="h-3.5 w-3.5 text-destructive" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Suggestion chips above input (when there are messages) */}
        {displayedMessages.length > 0 && !isLoading && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your Notion workspace..."
                  disabled={isLoading}
                  className="bg-secondary border-border pr-10 h-11 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
                />
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !inputValue.trim()}
                size="default"
                className="h-11 px-4 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
              >
                {isLoading ? (
                  <FiLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <FiSend className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              Notion Power Agent can create pages, search content, manage databases, and organize your workspace.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
