"use client"
import React from 'react'
import { Button } from '@/components/ui/button';
import Head from 'next/head';
import Contect from './_components/Contect';
import Link from 'next/link';
import { FaGithub } from "react-icons/fa";
import { motion } from "framer-motion";

const page = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <Head>
        <title>Hire.ai</title>
        <meta name="description" content="Ace your next interview with AI-powered mock interviews" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen">
        {/* Header Section */}
        <header className="w-full py-6 backdrop-blur-md bg-black/30 fixed top-0 z-50">
          <div className="container mx-auto flex justify-between items-center px-6">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
            >
              Hire.ai
            </motion.h1>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Master Your Interview Skills
              </h2>
              <p className="text-xl md:text-2xl text-gray-300 mb-12">
                Experience the future of interview preparation with AI-powered mock interviews
              </p>
              <div className="flex flex-col md:flex-row gap-6 justify-center">
                <Link href="/dashboard">
                  <Button className="px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105">
                    Get Started
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" className="px-8 py-6 text-lg border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-all duration-300 transform hover:scale-105">
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Features
              </h2>
              <p className="text-xl text-gray-300">
                Experience the power of AI-driven interview preparation
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:scale-105"
              >
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-6"></div>
                <h3 className="text-2xl font-semibold mb-4">AI Mock Interviews</h3>
                <p className="text-gray-400">Experience realistic interview scenarios powered by advanced AI technology.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:scale-105"
              >
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-6"></div>
                <h3 className="text-2xl font-semibold mb-4">Instant Feedback</h3>
                <p className="text-gray-400">Get real-time, personalized feedback to improve your performance.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:scale-105"
              >
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-6"></div>
                <h3 className="text-2xl font-semibold mb-4">Comprehensive Reports</h3>
                <p className="text-gray-400">Receive detailed analytics and insights about your interview performance.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <Contect />
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-black/50 backdrop-blur-md">
        <div className="container mx-auto text-center">
          <p className="text-gray-400">© 2024 AI Mock Interview. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default page