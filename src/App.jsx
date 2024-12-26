import { useState } from 'react';
import {
  Box,
  Container,
  Input,
  Button,
  VStack,
  Heading,
  Text,
  useToast,
  List,
  ListItem,
  Progress,
  Link
} from '@chakra-ui/react';
import { FaSearch, FaDownload } from 'react-icons/fa';

function App() {
  const [keyword, setKeyword] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search keyword',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      if (data && Array.isArray(data.projects)) {
        setProjects(data.projects);
        toast({
          title: 'Success',
          description: `Found ${data.projects.length} projects`,
          status: 'success',
          duration: 3000,
        });
      } else {
        setProjects([]);
        toast({
          title: 'Warning',
          description: 'No projects found',
          status: 'warning',
          duration: 3000,
        });
      }
    } catch (error) {
      setProjects([]);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDownload = (url) => {
    window.open(`/api/download?url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8}>
        <Heading>Web Scraper</Heading>
        
        <Box w="100%">
          <VStack spacing={4}>
            <Input
              placeholder="Enter search keyword..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              size="lg"
            />
            <Button
              leftIcon={<FaSearch />}
              colorScheme="blue"
              onClick={handleSearch}
              isLoading={loading}
              w="100%"
            >
              Search
            </Button>
          </VStack>
        </Box>

        {loading && <Progress size="xs" isIndeterminate w="100%" />}

        {Array.isArray(projects) && projects.length > 0 && (
          <List spacing={3} w="100%">
            {projects.map((project, index) => (
              <ListItem
                key={index}
                p={4}
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
              >
                <Text fontSize="sm" noOfLines={2} mb={2}>
                  {project.title || project.url}
                </Text>
                <Button
                  size="sm"
                  leftIcon={<FaDownload />}
                  onClick={() => handleDownload(project.url)}
                >
                  Download
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </VStack>
    </Container>
  );
}

export default App;
