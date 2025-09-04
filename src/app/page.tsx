"use client";

import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import fs from 'fs';

export default function Playground() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const clipboardRef = useRef<any>(null); // store copied object
  let fileName = ''
  useEffect(() => {
    const canvas = new fabric.Canvas("canvas", {
      width: 736,
      height: 1306,
      backgroundColor: "#f3f3f3",
    });
    canvasRef.current = canvas;
    setCanvasReady(true);

    // ✅ Add keyboard shortcuts for copy/paste
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;

      // Detect Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copyObject();
      }

      // Detect Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteObject();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        deleteSelectedObjects()
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
    };
  }, []);

  const handleUploadSVG = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;
    fileName = e.target.files[0].name.slice(0,-4)
    console.log(fileName)

    const reader = new FileReader();
    reader.onload = (event) => {
      const svgString = event.target?.result as string;
      fabric.loadSVGFromString(svgString, (objects: any, options: any) => {
        const svgGroup = fabric.util.groupSVGElements(objects, options);
        svgGroup.selectable = false;
        svgGroup.evented = false;
        (svgGroup as any).excludeFromExport = true;
        canvasRef.current?.add(svgGroup).sendToBack(svgGroup);
      });
    };
    reader.readAsText(file);
  };

  // ✅ Copy selected object/group
  const copyObject = () => {
    if (!canvasRef.current) return;
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: any) => {
        clipboardRef.current = cloned;
      });
    }
  };

  // ✅ Paste cloned object
  const pasteObject = () => {
    if (!canvasRef.current || !clipboardRef.current) return;

    clipboardRef.current.clone((clonedObj: any) => {
      canvasRef.current?.discardActiveObject();

      clonedObj.set({
        left: (clonedObj.left || 0) + 20, // offset so it doesn’t overlap
        top: (clonedObj.top || 0) + 20,
        evented: true,
      });

      if (clonedObj.type === "activeSelection") {
        clonedObj.canvas = canvasRef.current;
        clonedObj.forEachObject((obj: any) => {
          canvasRef.current?.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvasRef.current?.add(clonedObj);
      }

      clipboardRef.current.top += 20;
      clipboardRef.current.left += 20;
      canvasRef.current?.setActiveObject(clonedObj);
      canvasRef.current?.requestRenderAll();
    });
  };

  const deleteSelectedObjects = () => {
    if (!canvasRef) return

    const activeObjects = canvasRef.current.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj: any) => {
      canvasRef.current.remove(obj)
    })

    canvasRef.current.discardActiveObject()
    canvasRef.current.renderAll()
  }

  const addRect = () => {
    if (!canvasRef.current) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: "rgba(0,0,255,0.3)",
      width: 100,
      height: 60,
      stroke: "blue",
      strokeWidth: 2,
    });
    canvasRef.current.add(rect);
  };

  const addCircle = () => {
    if (!canvasRef.current) return;
    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 40,
      fill: "rgba(255,0,0,0.3)",
      stroke: "red",
      strokeWidth: 2,
    });
    canvasRef.current.add(circle);
  };

  const groupSelected = () => {
    if (!canvasRef.current) return;
    const active = canvasRef.current.getActiveObjects();
    if (active.length > 1) {
      const group = new fabric.Group(active, { subtopic: true });
      canvasRef.current.discardActiveObject();
      active.forEach((obj: any) => canvasRef.current?.remove(obj));
      canvasRef.current.add(group);
    }
  };

  const extractJSON = () => {
    if (!canvasRef.current) return;

    const objects = canvasRef.current.getObjects().filter((o: any) => !o.excludeFromExport);

    const topicObj = objects.find((o: any) => !("subtopic" in o));
    const subtopicGroups = objects.filter((o: any) => (o as any).subtopic);

    const topic = topicObj
      ? {
          x: topicObj.left || 0,
          y: topicObj.top || 0,
          width: topicObj.width ? topicObj.width * topicObj.scaleX! : 0,
          height: topicObj.height ? topicObj.height * topicObj.scaleY! : 0,
        }
      : null;

    const subtopics = subtopicGroups.map((group: any) => {
      const g = group as fabric.Group;
      const members = g.getObjects();

      const entry: any = {};
      ["icon", "title", "content"].forEach((label, idx) => {
        const obj = members[idx];
        if (obj) {
          entry[label] = {
            x: obj.left || 0,
            y: obj.top || 0,
            width: obj.width ? obj.width * obj.scaleX! : 0,
            height: obj.height ? obj.height * obj.scaleY! : 0,
          };
        }
      });
      return entry;
    });
    
    const jsonResult = { topic, subtopics };
    const blob = new Blob([JSON.stringify(jsonResult, null, 4)], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.json`;
    link.click();

    console.log("Exported JSON:", JSON.stringify(jsonResult, null, 2));
    alert("Check console for extracted JSON!");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Infographic Playground</h1>
      <div className="flex gap-2 mb-4">
        <input type="file" accept=".svg" onChange={handleUploadSVG} />
        <button onClick={addRect} className="px-3 py-1 bg-blue-500 text-white rounded">
          Add Rectangle
        </button>
        <button onClick={addCircle} className="px-3 py-1 bg-red-500 text-white rounded">
          Add Circle
        </button>
        <button onClick={groupSelected} className="px-3 py-1 bg-green-500 text-white rounded">
          Group as Subtopic
        </button>
        <button onClick={extractJSON} className="px-3 py-1 bg-gray-700 text-white rounded">
          Export JSON
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-2">💡 Use Ctrl+C / Ctrl+V (Cmd+C / Cmd+V on Mac) to copy & paste objects.</p>
      <canvas id="canvas" className="border border-gray-400" />
    </div>
  );
}
