#!/usr/bin/env node

const API_REGISTER_URL = 'http://localhost:4000/api/ui-register';

const toolsToRegister = [
  {
    name: 'UserProfileCard',
    description: 'A card to display a user\'s profile information, such as name, title, and avatar.',
    code: `
        import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
        import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
        
        export default function UserProfileCard({ name = 'Jane Doe', title = 'Software Engineer', avatarUrl = 'https://github.com/shadcn.png' }) {
            const fallback = name.split(' ').map(n => n[0]).join('');
            return (
                <div className="p-4 bg-gray-100 flex items-center justify-center min-h-screen dark:bg-gray-900">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={avatarUrl} alt={name} />
                                    <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-2xl">{name}</CardTitle>
                                    <p className="text-md text-gray-500 dark:text-gray-400">{title}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 dark:text-gray-300">This is a dynamically generated user profile card using shadcn/ui components.</p>
                        </CardContent>
                    </Card>
                </div>
            )
        }
    `
  },
  {
    name: 'SystemStatusIndicator',
    description: 'A component to display the current system status with a colored indicator.',
    code: `
        import { cn } from "@/lib/utils"

        function SystemStatusIndicator({ status = 'operational' }) {
          const statusConfig = {
            operational: {
              color: 'bg-green-500',
              text: 'All systems operational',
            },
            degraded: {
              color: 'bg-yellow-500',
              text: 'System is running with degraded performance',
            },
            outage: {
              color: 'bg-red-500',
              text: 'A system outage is in effect',
            },
          };

          const currentStatus = statusConfig[status] || statusConfig.operational;

          return (
            <div className="p-4 bg-gray-100 flex items-center justify-center min-h-screen dark:bg-gray-900">
                <div className="flex items-center space-x-4 p-4 border rounded-lg bg-white dark:bg-black w-full max-w-sm">
                    <span className={cn("h-4 w-4 rounded-full animate-pulse", currentStatus.color)}></span>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{currentStatus.text}</p>
                </div>
            </div>
          );
        }

        export default SystemStatusIndicator;
    `
  },
  {
    name: 'CptCodeSelector',
    description: 'An interactive medical billing tool to select multiple CPT codes, view selections, and see billing details.',
    code: `
        import { useState, useEffect } from 'react';
        import { Check, ChevronsUpDown } from "lucide-react"
        import { cn } from "@/lib/utils"
        import { Button } from "@/components/ui/button"
        import {
          Command,
          CommandEmpty,
          CommandGroup,
          CommandInput,
          CommandItem,
          CommandList,
        } from "@/components/ui/command"
        import {
          Popover,
          PopoverContent,
          PopoverTrigger,
        } from "@/components/ui/popover"
        import { Badge } from "@/components/ui/badge"
        import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
        import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"


        const CPT_CODES = [
          { value: '99213', label: 'Office Visit - Established Patient, 15 min', unit: 1, rate: 75.50 },
          { value: '99214', label: 'Office Visit - Established Patient, 25 min', unit: 1, rate: 125.00 },
          { value: '99396', label: 'Preventive Visit - Established Patient, 65+', unit: 1, rate: 210.00 },
          { value: '85025', label: 'Complete Blood Count (CBC)', unit: 1, rate: 45.00 },
          { value: '93000', label: 'Electrocardiogram (ECG)', unit: 1, rate: 150.75 },
        ];

        export default function CptCodeSelector() {
          const [open, setOpen] = useState(false);
          const [selectedValues, setSelectedValues] = useState(new Set());

          const selectedCodes = CPT_CODES.filter(code => selectedValues.has(code.value));
          const totalAmount = selectedCodes.reduce((sum, code) => sum + code.rate, 0);

          return (
            <div className="p-4 bg-gray-100 flex items-center justify-center min-h-screen dark:bg-gray-900">
              <Card className="w-full max-w-2xl">
                <CardHeader>
                  <CardTitle>CPT Code Billing Selector</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select CPT codes for the current medical billing claim.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col space-y-4">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {selectedCodes.length > 0
                            ? \`\${selectedCodes.length} code(s) selected\`
                            : "Select CPT code(s)..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search CPT code..." />
                          <CommandList>
                            <CommandEmpty>No CPT code found.</CommandEmpty>
                            <CommandGroup>
                              {CPT_CODES.map((code) => (
                                <CommandItem
                                  key={code.value}
                                  value={code.label}
                                  onSelect={() => {
                                    setSelectedValues(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(code.value)) {
                                        newSet.delete(code.value);
                                      } else {
                                        newSet.add(code.value);
                                      }
                                      return newSet;
                                    });
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedValues.has(code.value) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {code.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="space-x-2">
                        <span className="text-sm font-medium">Selected:</span>
                        {selectedCodes.length > 0 ? (
                            selectedCodes.map(code => <Badge key={code.value} variant="secondary">{code.value}</Badge>)
                        ) : (
                            <span className="text-sm text-gray-500">None</span>
                        )}
                    </div>
                  </div>

                  <div>
                      <h3 className="text-lg font-semibold mb-2">Billing Summary</h3>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>CPT Code</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Units</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {selectedCodes.length > 0 ? (
                                  selectedCodes.map(code => (
                                      <TableRow key={code.value}>
                                          <TableCell className="font-medium">{code.value}</TableCell>
                                          <TableCell>{code.label}</TableCell>
                                          <TableCell className="text-right">{code.unit}</TableCell>
                                          <TableCell className="text-right">$\${code.rate.toFixed(2)}</TableCell>
                                      </TableRow>
                                  ))
                              ) : (
                                  <TableRow>
                                      <TableCell colSpan={4} className="text-center text-gray-500">No codes selected</TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>

                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="text-xl font-bold">
                        Total: $\${totalAmount.toFixed(2)}
                    </div>
                    <Button onClick={() => alert(\`Submitting claim for \${totalAmount.toFixed(2)}\`)} disabled={selectedCodes.length === 0}>
                        Submit Claim
                    </Button>
                </CardFooter>
              </Card>
            </div>
          );
        }
    `
  }
];

async function registerTool(tool) {
  console.log(`Registering tool: ${tool.name}...`);
  try {
    const response = await fetch(API_REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to register ${tool.name}. Status: ${response.status}. Body: ${errorText}`);
    }

    const result = await response.json();
    console.log(`Successfully registered ${tool.name}. Response:`, result.path);
  } catch (error) {
    console.error(`Error registering ${tool.name}:`, error.message);
  }
}

async function main() {
  // Ensure server is running
  try {
    await fetch('http://localhost:4000');
  } catch (e) {
    console.error("Server not running on http://localhost:4000. Please run './scripts/start-dev.sh' first.");
    return;
  }
  
  console.log('Starting tool registration...');
  for (const tool of toolsToRegister) {
    await registerTool(tool);
  }
  console.log('\\nTool registration process finished. You can now test them in the chat.');
}

main(); 