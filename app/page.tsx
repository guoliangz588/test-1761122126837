"use client";

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UITool {
  id: string;
  name: string;
  description: string;
  filename: string;
  url: string;
  createdAt: string;
}

export default function HomePage() {
  const [tools, setTools] = useState<UITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/ui-register');
      const data = await response.json();
      if (data.success) {
        setTools(data.tools);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTool = async (toolId: string, toolName: string) => {
    // 确认对话框
    if (!confirm(`Are you sure you want to delete "${toolName}"?\n\nThis action cannot be undone and will remove the tool from all system configurations.`)) {
      return;
    }

    setDeleting(toolId);
    
    try {
      console.log(`🗑️ Deleting UI tool: ${toolId}`);
      
      const response = await fetch(`/api/ui-register?id=${encodeURIComponent(toolId)}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`✅ UI tool deleted successfully:`, result);
        
        // Show success message if systems were updated
        if (result.systemsUpdatedCount > 0) {
          alert(`Tool "${toolName}" deleted successfully!\n\n${result.systemsUpdatedCount} system configuration(s) were updated:\n${result.updatedSystems.join('\n')}`);
        } else {
          alert(`Tool "${toolName}" deleted successfully!`);
        }
        
        // Refresh the tools list
        await fetchTools();
      } else {
        throw new Error(result.error || 'Failed to delete tool');
      }
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert(`Failed to delete "${toolName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading UI tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">UI Tool Server</h1>
          <p className="text-muted-foreground">
            Dynamic UI component server running on localhost:4000
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {tools.length} tool{tools.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        {tools.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2">No UI tools registered yet</h3>
              <p className="text-muted-foreground mb-4">
                Send a POST request to <code className="bg-muted px-1 rounded">/api/ui-register</code> to register your first UI tool.
              </p>
              <div className="bg-muted p-4 rounded-lg text-left">
                <pre className="text-xs">
{`{
  "name": "My Button",
  "description": "A simple button component",
  "code": "export default function MyButton() { return <button>Click me</button>; }"
}`}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <strong>File:</strong> {tool.filename}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Created:</strong> {new Date(tool.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button asChild size="sm">
                        <a href={`/${tool.id}`} target="_blank" rel="noopener noreferrer">
                          View Component
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(tool.url)}
                      >
                        Copy URL
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteTool(tool.id, tool.name)}
                        disabled={deleting === tool.id}
                      >
                        {deleting === tool.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-3">API Usage</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Register a new UI tool:</strong>
              <code className="block bg-background p-2 rounded mt-1">
                POST http://localhost:4000/api/ui-register
              </code>
            </div>
            <div>
              <strong>List all tools:</strong>
              <code className="block bg-background p-2 rounded mt-1">
                GET http://localhost:4000/api/ui-register
              </code>
            </div>
            <div>
              <strong>Delete a UI tool:</strong>
              <code className="block bg-background p-2 rounded mt-1">
                DELETE http://localhost:4000/api/ui-register?id=tool-id
              </code>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically removes the tool from all system configurations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}