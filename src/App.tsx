import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import MergePDF from './pages/MergePDF'
import SplitPDF from './pages/SplitPDF'
import EditPDF from './pages/EditPDF'
import CompressPDF from './pages/CompressPDF'
import AddWatermark from './pages/AddWatermark'
import ImagesToPDF from './pages/ImagesToPDF'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MergePDF />} />
        <Route path="/merge" element={<MergePDF />} />
        <Route path="/split" element={<SplitPDF />} />
        <Route path="/edit" element={<EditPDF />} />
        <Route path="/compress" element={<CompressPDF />} />
        <Route path="/watermark" element={<AddWatermark />} />
        <Route path="/images-to-pdf" element={<ImagesToPDF />} />
      </Routes>
    </Layout>
  )
}

export default App
