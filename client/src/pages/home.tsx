import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Settings, Info, Plus, Search, Trash2, TestTube } from "lucide-react";

interface ConnectionStatus {
  openai: boolean;
  pinecone: boolean;
  vectorCount: number;
}

interface QueryResponse {
  query: any;
  embedding: {
    dimensions: number;
    model: string;
    preview: number[];
  };
  searchResults: Array<{
    id: string;
    score: number;
    text: string;
    category: string;
    timestamp: string;
  }>;
  chatResponse: {
    response: string;
    tokensUsed: number;
    model: string;
    contextCount: number;
    avgSimilarity: number;
  };
}

interface ApiLog {
  id: string;
  method: string;
  endpoint: string;
  status: number;
  duration: number;
  timestamp: Date;
}

export default function Home() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [category, setCategory] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [chatModel, setChatModel] = useState("gpt-4o");
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastQueryResponse, setLastQueryResponse] = useState<QueryResponse | null>(null);

  // Query for connection status
  const { data: connectionStatus, refetch: refetchConnections } = useQuery<ConnectionStatus>({
    queryKey: ["/api/test-connections"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for API logs
  const { data: apiLogs } = useQuery<ApiLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Mutation for processing queries
  const processQueryMutation = useMutation({
    mutationFn: async (queryData: { query: string; topK: number; threshold: number; chatModel: string }) => {
      const response = await apiRequest("POST", "/api/query", queryData);
      return response.json();
    },
    onMutate: () => {
      setCurrentStep(1);
      setTimeout(() => setCurrentStep(2), 500);
      setTimeout(() => setCurrentStep(3), 1000);
      setTimeout(() => setCurrentStep(4), 1500);
    },
    onSuccess: (data: QueryResponse) => {
      setLastQueryResponse(data);
      setCurrentStep(0);
      toast({
        title: "Query processed successfully",
        description: `Found ${data.searchResults.length} relevant documents`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error) => {
      setCurrentStep(0);
      toast({
        title: "Query processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Mutation for adding documents
  const addDocumentMutation = useMutation({
    mutationFn: async (documentData: { content: string; category: string; documentId: string }) => {
      const response = await apiRequest("POST", "/api/documents", documentData);
      return response.json();
    },
    onSuccess: () => {
      setDocumentText("");
      setDocumentId("");
      setCategory("");
      toast({
        title: "Document added successfully",
        description: "Document has been embedded and stored in the knowledge base",
      });
      refetchConnections();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to add document",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Mutation for clearing knowledge base
  const clearKnowledgeBaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/documents");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Knowledge base cleared",
        description: "All documents have been removed from the knowledge base",
      });
      refetchConnections();
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to clear knowledge base",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Mutation for clearing logs
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/logs");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API logs cleared",
        description: "All API logs have been cleared",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to clear logs",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleProcessQuery = () => {
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a query to process",
        variant: "destructive",
      });
      return;
    }

    processQueryMutation.mutate({
      query,
      topK,
      threshold,
      chatModel,
    });
  };

  const handleAddDocument = () => {
    if (!documentText.trim() || !documentId.trim() || !category.trim()) {
      toast({
        title: "All fields required",
        description: "Please fill in all document fields",
        variant: "destructive",
      });
      return;
    }

    addDocumentMutation.mutate({
      content: documentText,
      category,
      documentId,
    });
  };

  const handleClearKnowledgeBase = () => {
    if (window.confirm("Are you sure you want to clear the entire knowledge base?")) {
      clearKnowledgeBaseMutation.mutate();
    }
  };

  const steps = [
    { name: "Query Input", active: currentStep >= 1 },
    { name: "Generate Embedding", active: currentStep >= 2 },
    { name: "Vector Search", active: currentStep >= 3 },
    { name: "ChatGPT Response", active: currentStep >= 4 },
  ];

  return (
    <div className="flex h-screen bg-slate-850 text-slate-100">
      {/* Sidebar */}
      <div className="w-80 bg-slate-750 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">RAG Pipeline</h1>
              <p className="text-sm text-slate-400">ChatGPT + Pinecone</p>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Configuration</h3>
            
            {/* Status Indicators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus?.openai ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-slate-300">OpenAI API</span>
                </div>
                <span className={`text-xs font-medium ${connectionStatus?.openai ? 'text-green-400' : 'text-red-400'}`}>
                  {connectionStatus?.openai ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus?.pinecone ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-slate-300">Pinecone DB</span>
                </div>
                <span className={`text-xs font-medium ${connectionStatus?.pinecone ? 'text-green-400' : 'text-red-400'}`}>
                  {connectionStatus?.pinecone ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {connectionStatus?.vectorCount !== undefined && (
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-300">Vector Count</span>
                  <span className="text-sm font-mono text-blue-400">{connectionStatus.vectorCount}</span>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-300 mb-2">Embedding Model</Label>
                <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                    <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                    <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-slate-300 mb-2">Chat Model</Label>
                <Select value={chatModel} onValueChange={setChatModel}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                    <SelectItem value="gpt-4">gpt-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-300 mb-2">Top K Results</Label>
                <Input 
                  type="number" 
                  value={topK} 
                  onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                  className="w-full bg-slate-800 border-slate-600 text-white"
                  data-testid="input-topk"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-300 mb-2">Similarity Threshold</Label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  data-testid="slider-threshold"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0.0</span>
                  <span>{threshold.toFixed(1)}</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={handleClearKnowledgeBase}
                disabled={clearKnowledgeBaseMutation.isPending}
                data-testid="button-clear-index"
              >
                {clearKnowledgeBaseMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Clear Knowledge Base
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => refetchConnections()}
                data-testid="button-test-connections"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Connections
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-slate-750 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-white">RAG Pipeline Testing</h2>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span>Environment:</span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400">Development</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Info className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Pipeline Steps */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step.active ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    step.active ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-px bg-slate-600 ml-4"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Query Input Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <Card className="bg-slate-750 border-slate-600">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Query Input</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-300 mb-2">User Query</Label>
                      <Textarea 
                        placeholder="Enter your question or query here..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-32 bg-slate-800 border-slate-600 text-white placeholder-slate-400 resize-none"
                        data-testid="textarea-query"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleProcessQuery}
                        disabled={processQueryMutation.isPending}
                        data-testid="button-process-query"
                      >
                        {processQueryMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Search className="w-4 h-4 mr-2" />
                        )}
                        Process Query
                      </Button>
                      <Button 
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        onClick={() => setQuery("")}
                        data-testid="button-clear-query"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add to Knowledge Base */}
              <Card className="bg-slate-750 border-slate-600">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Add to Knowledge Base</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-300 mb-2">Document Text</Label>
                      <Textarea 
                        placeholder="Paste document content to add to the knowledge base..."
                        value={documentText}
                        onChange={(e) => setDocumentText(e.target.value)}
                        className="w-full h-24 bg-slate-800 border-slate-600 text-white placeholder-slate-400 resize-none"
                        data-testid="textarea-document"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-slate-300 mb-2">Document ID</Label>
                        <Input 
                          placeholder="doc_001"
                          value={documentId}
                          onChange={(e) => setDocumentId(e.target.value)}
                          className="w-full bg-slate-800 border-slate-600 text-white placeholder-slate-400"
                          data-testid="input-document-id"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-300 mb-2">Category</Label>
                        <Input 
                          placeholder="documentation"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-slate-800 border-slate-600 text-white placeholder-slate-400"
                          data-testid="input-category"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleAddDocument}
                      disabled={addDocumentMutation.isPending}
                      data-testid="button-add-document"
                    >
                      {addDocumentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add to Knowledge Base
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              {/* Embedding Result */}
              <Card className="bg-slate-750 border-slate-600">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Query Embedding</h3>
                  {lastQueryResponse ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Dimensions:</span>
                        <span className="text-blue-400 font-mono" data-testid="text-dimensions">
                          {lastQueryResponse.embedding.dimensions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Model:</span>
                        <span className="text-blue-400 font-mono" data-testid="text-model">
                          {lastQueryResponse.embedding.model}
                        </span>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-2">Vector Preview (first 10 dimensions):</p>
                        <code className="text-xs text-green-400 font-mono break-all" data-testid="text-embedding-preview">
                          [{lastQueryResponse.embedding.preview.map(v => v.toFixed(4)).join(', ')}, ...]
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">Process a query to see embedding results</div>
                  )}
                </CardContent>
              </Card>

              {/* Search Results */}
              <Card className="bg-slate-750 border-slate-600">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>
                  {lastQueryResponse?.searchResults && lastQueryResponse.searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {lastQueryResponse.searchResults.map((result, index) => (
                        <div key={result.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700" data-testid={`search-result-${index}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-400">{result.id}</span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs font-mono ${
                                result.score >= 0.9 ? 'bg-green-500/10 text-green-400' :
                                result.score >= 0.8 ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {result.score.toFixed(2)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300 mb-2">{result.text}</p>
                          <div className="flex items-center space-x-3 text-xs text-slate-400">
                            <span>{result.category}</span>
                            <span>•</span>
                            <span>{new Date(result.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">No search results to display</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ChatGPT Response Section */}
          {lastQueryResponse && (
            <Card className="bg-slate-750 border-slate-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Enhanced ChatGPT Response</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Response time:</span>
                    <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-400 font-mono">
                      {(lastQueryResponse.query.responseTime || 0).toFixed(2)}s
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Context Used */}
                  <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Retrieved Context</h4>
                    <p className="text-sm text-slate-300">
                      Based on {lastQueryResponse.chatResponse.contextCount} relevant documents from your knowledge base 
                      with an average similarity score of {lastQueryResponse.chatResponse.avgSimilarity.toFixed(2)}.
                    </p>
                  </div>

                  {/* Response Content */}
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-100 leading-relaxed whitespace-pre-wrap" data-testid="text-chat-response">
                        {lastQueryResponse.chatResponse.response}
                      </div>
                    </div>
                  </div>

                  {/* Response Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
                    <div className="text-center">
                      <div className="text-lg font-mono text-blue-400" data-testid="text-context-count">
                        {lastQueryResponse.chatResponse.contextCount}
                      </div>
                      <div className="text-xs text-slate-400">Context Docs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-mono text-green-400" data-testid="text-tokens-used">
                        {lastQueryResponse.chatResponse.tokensUsed}
                      </div>
                      <div className="text-xs text-slate-400">Tokens Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-mono text-yellow-400" data-testid="text-avg-similarity">
                        {lastQueryResponse.chatResponse.avgSimilarity.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">Avg Similarity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-mono text-purple-400" data-testid="text-model-used">
                        {lastQueryResponse.chatResponse.model}
                      </div>
                      <div className="text-xs text-slate-400">Model Used</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Logs Section */}
          <Card className="mt-8 bg-slate-750 border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">API Request Logs</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-400 hover:text-white"
                  onClick={() => clearLogsMutation.mutate()}
                  data-testid="button-clear-logs"
                >
                  Clear Logs
                </Button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {apiLogs && apiLogs.length > 0 ? (
                  apiLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center space-x-3 py-2 px-3 bg-slate-800 rounded text-sm font-mono" data-testid={`log-${log.id}`}>
                      <span className="text-slate-400 text-xs">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          log.status >= 200 && log.status < 300 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {log.status}
                      </Badge>
                      <span className={`${
                        log.method === 'GET' ? 'text-blue-400' :
                        log.method === 'POST' ? 'text-purple-400' :
                        log.method === 'DELETE' ? 'text-red-400' :
                        'text-slate-300'
                      }`}>
                        {log.method}
                      </span>
                      <span className="text-slate-300">{log.endpoint}</span>
                      <span className="text-slate-400">{log.duration.toFixed(0)}ms</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">No API logs to display</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
