/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * utils.h - Utility functions and JSON helpers
 */

#ifndef UTILS_H
#define UTILS_H

#include <algorithm>
#include <sstream>
#include <string>
#include <vector>

namespace Utils {
// Simple JSON builder (no external dependency needed)
inline std::string jsonString(const std::string &key,
                              const std::string &value) {
  return "\"" + key + "\":\"" + value + "\"";
}

inline std::string jsonInt(const std::string &key, int value) {
  return "\"" + key + "\":" + std::to_string(value);
}

inline std::string jsonDouble(const std::string &key, double value) {
  std::ostringstream oss;
  oss << std::fixed;
  oss.precision(2);
  oss << value;
  return "\"" + key + "\":" + oss.str();
}

inline std::string jsonBool(const std::string &key, bool value) {
  return "\"" + key + "\":" + (value ? "true" : "false");
}

inline std::string jsonArray(const std::string &key,
                             const std::vector<std::string> &items) {
  std::string result = "\"" + key + "\":[";
  for (size_t i = 0; i < items.size(); i++) {
    if (i > 0)
      result += ",";
    result += items[i];
  }
  result += "]";
  return result;
}

inline std::string jsonObject(const std::vector<std::string> &fields) {
  std::string result = "{";
  for (size_t i = 0; i < fields.size(); i++) {
    if (i > 0)
      result += ",";
    result += fields[i];
  }
  result += "}";
  return result;
}

// Simple JSON parser for incoming commands
inline std::string extractJsonString(const std::string &json,
                                     const std::string &key) {
  std::string search = "\"" + key + "\":\"";
  auto pos = json.find(search);
  if (pos == std::string::npos)
    return "";
  pos += search.length();
  auto end = json.find("\"", pos);
  if (end == std::string::npos)
    return "";
  return json.substr(pos, end - pos);
}

inline int extractJsonInt(const std::string &json, const std::string &key) {
  std::string search = "\"" + key + "\":";
  auto pos = json.find(search);
  if (pos == std::string::npos)
    return 0;
  pos += search.length();
  // Skip whitespace
  while (pos < json.length() && json[pos] == ' ')
    pos++;
  std::string numStr;
  bool negative = false;
  if (pos < json.length() && json[pos] == '-') {
    negative = true;
    pos++;
  }
  while (pos < json.length() && json[pos] >= '0' && json[pos] <= '9') {
    numStr += json[pos++];
  }
  if (numStr.empty())
    return 0;
  int val = std::stoi(numStr);
  return negative ? -val : val;
}

// Trim whitespace
inline std::string trim(const std::string &s) {
  auto start = s.find_first_not_of(" \t\n\r");
  if (start == std::string::npos)
    return "";
  auto end = s.find_last_not_of(" \t\n\r");
  return s.substr(start, end - start + 1);
}
} // namespace Utils

#endif // UTILS_H
