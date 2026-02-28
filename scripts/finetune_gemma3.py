"""
Gemma 3 Fine-Tuning Script for SOMA
Optimized for NVIDIA GTX 1650 Ti (4GB VRAM)

Uses QLoRA (4-bit quantization) to fit training in limited VRAM
"""

import os
import sys
import json
import torch
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

import transformers
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training
)
from datasets import load_dataset

@dataclass
class ModelArguments:
    # Use TinyLlama as a safe, ungated default for testing the pipeline
    # If you have local Gemma weights, change this path!
    model_name: str = field(default="TinyLlama/TinyLlama-1.1B-Chat-v1.0")
    model_path: Optional[str] = field(default=None)
    use_4bit: bool = field(default=True)
    use_nested_quant: bool = field(default=True)

@dataclass
class DataArguments:
    data_path: str = field(default="./SOMA/training-data")
    max_length: int = field(default=512)

@dataclass
class LoraArguments:
    lora_r: int = field(default=8)
    lora_alpha: int = field(default=16)
    lora_dropout: float = field(default=0.05)
    lora_target_modules: str = field(default="q_proj,v_proj")

def load_model_and_tokenizer(model_args):
    """Load Gemma with 4-bit quantization"""
    
    print(f"Loading {model_args.model_name} with 4-bit quantization...")
    
    # Configure 4-bit quantization for GTX 1650 Ti
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=model_args.use_4bit,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=model_args.use_nested_quant
    )
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        model_args.model_name,
        trust_remote_code=True
    )
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    
    # Load model with quantization
    model = AutoModelForCausalLM.from_pretrained(
        model_args.model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Prepare for LoRA training
    model = prepare_model_for_kbit_training(model)
    
    print(f"✅ Model loaded on {model.device}")
    print(f"✅ Memory footprint: {model.get_memory_footprint() / 1024**3:.2f} GB")
    
    return model, tokenizer

def setup_lora(model, lora_args):
    """Configure LoRA for efficient fine-tuning"""
    
    print("Setting up LoRA...")
    
    target_modules = lora_args.lora_target_modules.split(",")
    
    lora_config = LoraConfig(
        r=lora_args.lora_r,
        lora_alpha=lora_args.lora_alpha,
        target_modules=target_modules,
        lora_dropout=lora_args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    return model

def prepare_dataset(data_path, tokenizer, max_length):
    """Load and tokenize SOMA training data"""
    
    print(f"Loading dataset from {data_path}...")
    
    # Find latest training dataset
    data_dir = Path(data_path)
    
    # Prioritize burst data
    training_files = sorted(data_dir.glob("soma-training-burst-*.jsonl"))
    if not training_files:
        training_files = sorted(data_dir.glob("soma-training-*.jsonl"))
    
    if not training_files:
        raise FileNotFoundError(f"No training data found in {data_path}")
    
    latest_file = training_files[-1]
    print(f"Using: {latest_file}")
    
    # Load dataset
    dataset = load_dataset("json", data_files=str(latest_file), split="train")
    
    def tokenize_function(examples):
        # Convert messages format to text
        texts = []
        for msg_list in examples["messages"]:
            # Build conversation
            conversation = ""
            for msg in msg_list:
                if msg["role"] == "system":
                    conversation += f"System: {msg['content']}\n\n"
                elif msg["role"] == "user":
                    conversation += f"User: {msg['content']}\n\n"
                elif msg["role"] == "assistant":
                    conversation += f"Assistant: {msg['content']}\n\n"
            texts.append(conversation.strip())
        
        # Tokenize
        tokenized = tokenizer(
            texts,
            truncation=True,
            max_length=max_length,
            padding="max_length",
            return_tensors="pt"
        )
        
        # Labels = input_ids (causal LM)
        tokenized["labels"] = tokenized["input_ids"].clone()
        
        return tokenized
    
    # Tokenize dataset
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset.column_names,
        desc="Tokenizing"
    )
    
    # Split train/val
    split = tokenized_dataset.train_test_split(test_size=0.05)
    
    print(f"✅ Train examples: {len(split['train'])}")
    print(f"✅ Val examples: {len(split['test'])}")
    
    return split['train'], split['test']

def train(
    model,
    tokenizer,
    train_dataset,
    eval_dataset,
    output_dir="./SOMA/models/gemma3-soma-lora"
):
    """Train with GTX 1650 Ti-optimized settings"""
    
    print("Starting training...")
    
    # Training arguments optimized for 4GB VRAM
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=1,  # Small batch for limited VRAM
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=16,  # Effective batch = 16
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        logging_steps=10,
        save_strategy="steps",
        save_steps=100,
        eval_strategy="steps",
        eval_steps=100,
        save_total_limit=3,
        load_best_model_at_end=True,
        fp16=True,  # Mixed precision for speed
        gradient_checkpointing=True,  # Save memory
        optim="paged_adamw_8bit",  # Memory-efficient optimizer
        report_to="tensorboard",
        remove_unused_columns=False,
        max_grad_norm=0.3,
        weight_decay=0.001
    )
    
    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer
    )
    
    # Train
    print("\n🚀 Training started...")
    trainer.train()
    
    # Save final model
    print("\n💾 Saving model...")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    print(f"\n✅ Training complete! Model saved to {output_dir}")
    
    return trainer

def main():
    # Parse arguments (can extend with argparse later)
    model_args = ModelArguments()
    data_args = DataArguments()
    lora_args = LoraArguments()
    
    print("=" * 60)
    print("SOMA Gemma 3 Fine-Tuning")
    print("=" * 60)
    print(f"Model: {model_args.model_name}")
    print(f"Data: {data_args.data_path}")
    print(f"LoRA rank: {lora_args.lora_r}")
    print(f"4-bit: {model_args.use_4bit}")
    print("=" * 60)
    print()
    
    # Check CUDA
    if not torch.cuda.is_available():
        print("⚠️  WARNING: CUDA not available! Training will be slow on CPU.")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    else:
        print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
        print(f"✅ VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB\n")
    
    # Load model and tokenizer
    model, tokenizer = load_model_and_tokenizer(model_args)
    
    # Setup LoRA
    model = setup_lora(model, lora_args)
    
    # Prepare dataset
    train_dataset, eval_dataset = prepare_dataset(
        data_args.data_path,
        tokenizer,
        data_args.max_length
    )
    
    # Train
    trainer = train(model, tokenizer, train_dataset, eval_dataset)
    
    print("\n🎉 All done! SOMA is now smarter.")

if __name__ == "__main__":
    main()
