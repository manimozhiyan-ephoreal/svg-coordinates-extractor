"use client";
import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";

const baseLorem =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ";

export default function Playground() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const clipboardRef = useRef<any>(null); // store copied object
  let fileName = '' // track filename


  useEffect(() => {
    const canvas = new fabric.Canvas("canvas", {
      width: 800,
      height: 1200,
      backgroundColor: "#f3f3f3",
    });
    canvasRef.current = canvas;
    canvas.selection = true;

    // Add keyboard shortcuts for copy/paste
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;

      const moveBy = 5; // number of pixels to move per key press
      if (e.key === "ArrowUp") {
        e.preventDefault();
        canvasRef.current?.getActiveObjects().forEach((obj) => {
          obj.top = (obj.top || 0) - moveBy;
          obj.setCoords();
        });
        canvasRef.current?.requestRenderAll();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        canvasRef.current?.getActiveObjects().forEach((obj) => {
          obj.top = (obj.top || 0) + moveBy;
          obj.setCoords();
        });
        canvasRef.current?.requestRenderAll();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        canvasRef.current?.getActiveObjects().forEach((obj) => {
          obj.left = (obj.left || 0) - moveBy;
          obj.setCoords();
        });
        canvasRef.current?.requestRenderAll();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        canvasRef.current?.getActiveObjects().forEach((obj) => {
          obj.left = (obj.left || 0) + moveBy;
          obj.setCoords();
        });
        canvasRef.current?.requestRenderAll();
      }


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

    canvas.on("selection:created", (e) => {
      if (e.selected && e.selected.length > 0) {
        console.log("Selected:", e.selected);
      }
    });

    canvas.on("object:modified", (e) => {
      console.log("Object Modified:", e.target);
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
    };
  }, []);

  // handle svg upload
  const handleUploadSVG = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !canvasRef.current) return;
  fileName = e.target.files[0].name.slice(0, -4);
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

  // Copy selected object/group
  const copyObject = () => {
    if (!canvasRef.current) return;
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: any) => {
        clipboardRef.current = cloned;
      }, ["role"]); // include "role" in propertiesToInclude array
    }
  };


  // Paste cloned object
  const pasteObject = () => {
    if (!canvasRef.current || !clipboardRef.current) return;

    clipboardRef.current.clone((clonedObj: any) => {
      // Manually copy role if missing
      if (clipboardRef.current.role) {
        clonedObj.role = clipboardRef.current.role;
      }
      // If it's a group/activeSelection, copy roles for members
      if (clonedObj.type === "activeSelection") {
        clonedObj.forEachObject((obj: any, idx: number) => {
          const origObj = clipboardRef.current._objects[idx];
          if (origObj && origObj.role) {
            obj.role = origObj.role;
          }
        });
      }

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

  const addTopicBox = () => {
    if (!canvasRef.current) return;
    const initialText = baseLorem.slice(0, 15);
    const topic = new fabric.Textbox(initialText, {
      left: 10,
      top: 390,
      width: 220,
      height: 160,
      fontSize: 28,
      fontFamily: "Arial",
      fill: "black",
      backgroundColor: "#ffff99",
      role: "topic",
      editable: true,
      lockScalingY: true
    });
    

topic.on("scaling", () => {
  // Calculate the actual scaled width from original width and current scaleX
  const scaledWidth = topic.width * topic.scaleX;

  // Calculate how many characters to display based on scaledWidth
  let charCount = Math.floor(scaledWidth * 0.5);
  charCount = Math.min(charCount, baseLorem.length * 10);

  // Repeat lorem text and slice to required char count
  const repeatedLorem = baseLorem.repeat(Math.ceil(charCount / baseLorem.length));
  topic.text = repeatedLorem.slice(0, charCount);

  // Reset scaleX to 1 (actual width changes)
  topic.set({
    width: scaledWidth,
    scaleX: 1,
  });

  // Keep vertical scale locked (or fixed height)
  topic.scaleY = 1;
  topic.set({ height: topic.height });

  topic.canvas.requestRenderAll();
});

  canvasRef.current.add(topic);
};


  const addSubtopicObjects = () => {
    if (!canvasRef.current) return;
    const baseLeft = 336,
    baseTop = 64;
    let initialText = baseLorem.slice(0, 120);

    const icon = new fabric.Circle({
      left: baseLeft,
      top: baseTop,
      radius: 40,
      fill: "#5dd0f3",
      stroke: "#1b8ab3",
      strokeWidth: 2,
      role: "icon",
      selectable: true,
    });

    const initialTitleText = baseLorem.slice(0, 15);
    const title = new fabric.Textbox(initialTitleText, {
      left: baseLeft + 102,
      top: baseTop + 26,
      width: 257,
      height: 50,
      fontSize: 18,
      fontFamily: "Georgia",
      fill: "darkblue",
      backgroundColor: "#cfeafb",
      role: "subtopic-title",
      editable: true,
    });

    
    title.on("scaling", () => {
      const scaledWidth = title.width * title.scaleX;
      let charCount = Math.floor(scaledWidth * 0.5);
      charCount = Math.min(charCount, baseLorem.length * 10);
      const repeatedLorem = baseLorem.repeat(Math.ceil(charCount / baseLorem.length));
      title.text = repeatedLorem.slice(0, charCount);

      title.scaleX = 1;
      title.set({ width: scaledWidth });

      const scaledHeight = title.height * title.scaleY;
      title.scaleY = 1;
      title.set({ height: scaledHeight });

      title.canvas.requestRenderAll();
    });

    const content = new fabric.Textbox(initialText, {
      left: baseLeft + 101,
      top: baseTop + 88,
      width: 260,
      height: 170,
      fontSize: 18,
      fontFamily: "Georgia",
      fill: "black",
      backgroundColor: "#f5f5f5",
      role: "subtopic-content",
      editable: true,
    });

    content.on("scaling", () => {
      // Horizontal behavior: expand text length as width increases
      const scaledWidth = content.width * content.scaleX;
      let charCount = Math.floor(scaledWidth * 0.5);
      charCount = Math.min(charCount, baseLorem.length * 10);
      const repeatedLorem = baseLorem.repeat(Math.ceil(charCount / baseLorem.length));
      content.text = repeatedLorem.slice(0, charCount);

      // Reset scaleX to avoid distortion, update width instead
      content.scaleX = 1;
      content.set({ width: scaledWidth });

      // Vertical behavior: handle scaleY (vertical resize)
      const scaledHeight = content.height * content.scaleY;
      content.scaleY = 1; // reset scaleY
      content.set({ height: scaledHeight });

      content.canvas.requestRenderAll();
    });

    canvasRef.current.add(icon);
    canvasRef.current.add(title);
    canvasRef.current.add(content);
  };

  const extractJSON = () => {
    if (!canvasRef.current) return;
    let topicObj = canvasRef.current
      .getObjects("textbox")
      .find((obj) => obj.role === "topic");
    let icons = canvasRef.current
      .getObjects("circle")
      .filter((obj) => obj.role === "icon");
    let titles = canvasRef.current
      .getObjects("textbox")
      .filter((obj) => obj.role === "subtopic-title");
    let contents = canvasRef.current
      .getObjects("textbox")
      .filter((obj) => obj.role === "subtopic-content");

    const topic = topicObj
      ? {
          x: topicObj.left || 0,
          y: topicObj.top || 0,
          width: topicObj.width ? topicObj.width * (topicObj.scaleX || 1) : 0,
          height: topicObj.height ? topicObj.height * (topicObj.scaleY || 1) : 0,
          fontSize: topicObj.fontSize,
          fontFamily: topicObj.fontFamily,
          numChars: topicObj.text.length,
        }
      : null;

    const subtopics = icons.map((iconObj, idx) => {
      const titleObj = titles[idx];
      const contentObj = contents[idx];
      return {
        icon: iconObj
          ? {
              x: iconObj.left || 0,
              y: iconObj.top || 0,
              width: iconObj.radius
                ? iconObj.radius * 2 * (iconObj.scaleX || 1)
                : iconObj.width * (iconObj.scaleX || 1),
              height: iconObj.radius
                ? iconObj.radius * 2 * (iconObj.scaleY || 1)
                : iconObj.height * (iconObj.scaleY || 1),
            }
          : {},
        title: titleObj
          ? {
              x: titleObj.left || 0,
              y: titleObj.top || 0,
              width: titleObj.width ? titleObj.width * (titleObj.scaleX || 1) : 0,
              height: titleObj.height
                ? titleObj.height * (titleObj.scaleY || 1)
                : 0,
              fontSize: titleObj.fontSize,
              fontFamily: titleObj.fontFamily,
              numChars: titleObj.text.length,
            }
          : {},
        content: contentObj
          ? {
              x: contentObj.left || 0,
              y: contentObj.top || 0,
              width: contentObj.width
                ? contentObj.width * (contentObj.scaleX || 1)
                : 0,
              height: contentObj.height
                ? contentObj.height * (contentObj.scaleY || 1)
                : 0,
              fontSize: contentObj.fontSize,
              fontFamily: contentObj.fontFamily,
              numChars: contentObj.text.length,
            }
          : {},
      };
    });

    const result = { topic, subtopics };

    const blob = new Blob([JSON.stringify(result, null, 4)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.json`;
    console.log(fileName)
    link.click();
    console.log("Exported JSON:", JSON.stringify(result, null, 2));
    alert("Exported JSON to file. Check console for preview.");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Infographic Playground</h1>
      <div className="flex gap-2 mb-4">
        <input type="file" accept=".svg" onChange={handleUploadSVG} />
        <button
          onClick={addTopicBox}
          className="px-3 py-1 bg-yellow-500 text-black rounded"
        >
          Add Topic Box
        </button>
        <button
          onClick={addSubtopicObjects}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Add Subtopic Objects
        </button>
        <button
          onClick={extractJSON}
          className="px-3 py-1 bg-gray-700 text-white rounded"
        >
          Export JSON
        </button>
      </div>
      <canvas id="canvas" className="border border-gray-400" />
      <p className="text-sm text-gray-600 mt-2">
        All canvas objects can be individually selected, moved, resized, and
        edited.
        <br />
        Click any textbox and type to change its text; drag/scale all objects.
        <br />
        JSON export will reflect individual object edits!
      </p>
    </div>
  );
}
