import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

interface UIToolData {
  name: string;
  description: string;
  code: string;
}

// Helper function to remove a UI tool from all system configurations
async function removeToolFromSystemConfigs(toolId: string): Promise<string[]> {
  const updatedSystems: string[] = [];
  
  try {
    const systemsDir = path.join(process.cwd(), 'data', 'agent-systems');
    
    // Check if systems directory exists
    try {
      await fs.access(systemsDir);
    } catch {
      console.log(`  📁 Systems directory not found: ${systemsDir}`);
      return updatedSystems;
    }
    
    const files = await fs.readdir(systemsDir);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(systemsDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const system = JSON.parse(content);
        
        if (system.uiTools && Array.isArray(system.uiTools)) {
          const originalLength = system.uiTools.length;
          system.uiTools = system.uiTools.filter((tool: string) => tool !== toolId);
          
          if (system.uiTools.length < originalLength) {
            // Update the lastActive timestamp
            if (system.metadata) {
              system.metadata.lastActive = new Date().toISOString();
            }
            
            await fs.writeFile(filePath, JSON.stringify(system, null, 2));
            updatedSystems.push(system.name || system.id);
            console.log(`    ✅ Removed '${toolId}' from system: ${system.name || system.id}`);
          }
        }
        
        // Also remove from agent toolAccess if present
        if (system.agents && Array.isArray(system.agents)) {
          let agentsUpdated = false;
          system.agents.forEach((agent: any) => {
            if (agent.toolAccess && Array.isArray(agent.toolAccess)) {
              const originalLength = agent.toolAccess.length;
              agent.toolAccess = agent.toolAccess.filter((tool: string) => tool !== toolId);
              if (agent.toolAccess.length < originalLength) {
                agentsUpdated = true;
                console.log(`    ✅ Removed '${toolId}' from agent ${agent.name} toolAccess`);
              }
            }
          });
          
          if (agentsUpdated) {
            if (system.metadata) {
              system.metadata.lastActive = new Date().toISOString();
            }
            await fs.writeFile(filePath, JSON.stringify(system, null, 2));
            if (!updatedSystems.includes(system.name || system.id)) {
              updatedSystems.push(system.name || system.id);
            }
          }
        }
        
      } catch (error) {
        console.error(`    ❌ Error processing system file ${file}:`, error);
      }
    }
    
  } catch (error) {
    console.error(`  ❌ Error scanning system configurations:`, error);
  }
  
  return updatedSystems;
}

export async function POST(request: NextRequest) {
  try {
    const data: UIToolData = await request.json();
    
    if (!data.name || !data.description || !data.code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, code' },
        { status: 400 }
      );
    }

    // Sanitize the filename
    const safeName = data.name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create the TSX file content with description as comment
    const tsxContent = `/*
 * ${data.description}
 * Generated UI Tool Component
 */

${data.code}
`;

    // Define the file path in pages directory
    const pagesDir = path.join(process.cwd(), 'pages');
    const filePath = path.join(pagesDir, `${safeName}.tsx`);

    // Ensure pages directory exists
    try {
      await fs.access(pagesDir);
    } catch {
      await fs.mkdir(pagesDir, { recursive: true });
    }

    // Write the file
    await fs.writeFile(filePath, tsxContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `UI tool '${data.name}' registered successfully`,
      tool: {
        id: safeName,
        name: data.name,
        description: data.description,
        filename: `${safeName}.tsx`,
        url: `http://localhost:4000/${safeName}`,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error registering UI tool:', error);
    return NextResponse.json(
      { error: 'Failed to register UI tool' },
      { status: 500 }
    );
  }
}

// GET method to list all registered UI tools by scanning the pages directory
export async function GET() {
  try {
    const pagesDir = path.join(process.cwd(), 'pages');
    const tools = [];

    let files;
    try {
      files = await fs.readdir(pagesDir);
    } catch (err) {
      // If pages directory doesn't exist, return empty list
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ success: true, tools: [], count: 0 });
      }
      throw err;
    }

    for (const file of files) {
      // Ignore special Next.js files and non-tsx files
      if (
        !file.endsWith('.tsx') ||
        file.startsWith('_') ||
        file === 'index.tsx'
      ) {
        continue;
      }

      const filePath = path.join(pagesDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      const safeName = file.replace(/\.tsx$/, '');
      
      // Extract description from the first comment block
      const match = fileContent.match(/\/\*\s*\n?\s*\*?\s*(.*?)\s*\n/);
      const description = match ? match[1].trim() : 'No description found.';

      tools.push({
        id: safeName,
        name: safeName.replace(/-/g, ' '), // A more human-readable name
        description: description,
        filename: file,
        url: `http://localhost:4000/${safeName}`,
        createdAt: (await fs.stat(filePath)).mtime.toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      tools: tools,
      count: tools.length
    });

  } catch (error) {
    console.error('Error fetching UI tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UI tools' },
      { status: 500 }
    );
  }
}

// DELETE method to remove a UI tool
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('id');
    
    if (!toolId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    console.log(`🗑️ === UI TOOL DELETE REQUEST ===`);
    console.log(`  - Tool ID: ${toolId}`);

    // Sanitize the toolId to match our filename convention
    const safeName = toolId.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    console.log(`  - Sanitized filename: ${safeName}.tsx`);

    const pagesDir = path.join(process.cwd(), 'pages');
    const filePath = path.join(pagesDir, `${safeName}.tsx`);

    // Check if the file exists
    try {
      await fs.access(filePath);
      console.log(`  ✅ File exists: ${filePath}`);
    } catch (error) {
      console.log(`  ❌ File not found: ${filePath}`);
      return NextResponse.json(
        { error: `UI tool '${toolId}' not found` },
        { status: 404 }
      );
    }

    // Get file info before deletion for response
    const fileStats = await fs.stat(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const match = fileContent.match(/\/\*\s*\n?\s*\*?\s*(.*?)\s*\n/);
    const description = match ? match[1].trim() : 'No description found.';

    // Delete the file
    await fs.unlink(filePath);
    console.log(`  🗑️ File deleted successfully: ${filePath}`);

    // Remove from any system configurations that reference this tool
    console.log(`  🔍 Checking for system configurations that reference this tool...`);
    const updatedSystems = await removeToolFromSystemConfigs(safeName);
    console.log(`  📝 Updated ${updatedSystems.length} system configurations`);

    return NextResponse.json({
      success: true,
      message: `UI tool '${toolId}' deleted successfully`,
      deletedTool: {
        id: safeName,
        name: toolId,
        description: description,
        filename: `${safeName}.tsx`,
        deletedAt: new Date().toISOString(),
        originalCreatedAt: fileStats.mtime.toISOString()
      },
      updatedSystems: updatedSystems,
      systemsUpdatedCount: updatedSystems.length
    });

  } catch (error) {
    console.error('Error deleting UI tool:', error);
    return NextResponse.json(
      { error: 'Failed to delete UI tool' },
      { status: 500 }
    );
  }
}