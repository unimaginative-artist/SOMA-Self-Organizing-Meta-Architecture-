import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

const GraphNode = ({ position, label, color, onClick, isSelected }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={position}>
      <Sphere 
        ref={meshRef}
        args={[0.3, 16, 16]} 
        onClick={onClick}
        scale={isSelected ? 1.2 : 1}
      >
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </Sphere>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
};

const GraphEdge = ({ start, end, color = "#666666" }) => {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      opacity={0.3}
      transparent
    />
  );
};

const KnowledgeGraph3D = ({ nodes, edges, onNodeClick }) => {
  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeClick = (nodeId) => {
    setSelectedNode(nodeId);
    if (onNodeClick) onNodeClick(nodeId);
  };

  return (
    <div style={{ width: '100%', height: '500px', background: '#1a1a1a', borderRadius: '8px' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {edges.map((edge, idx) => (
          <GraphEdge
            key={`edge-${idx}`}
            start={edge.source}
            end={edge.target}
            color={edge.color}
          />
        ))}
        
        {nodes.map((node) => (
          <GraphNode
            key={node.id}
            position={node.position}
            label={node.label}
            color={node.color}
            onClick={() => handleNodeClick(node.id)}
            isSelected={selectedNode === node.id}
          />
        ))}
        
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default KnowledgeGraph3D;
